package com.petipy.consultant

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.telecom.Connection
import android.telecom.ConnectionRequest
import android.telecom.ConnectionService
import android.telecom.DisconnectCause
import android.telecom.PhoneAccount
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.telecom.VideoProfile
import java.util.concurrent.ConcurrentHashMap

internal object PetipyTelecomCallState {
  const val EXTRA_CALL_ID = "com.petipy.consultant.extra.CALL_ID"
  private const val PHONE_ACCOUNT_ID = "petipy-consultant"
  private const val PENDING_TTL_MS = 120_000L
  private const val MAX_RING_MS = 90_000L
  private val callIdPattern = Regex("^[A-Za-z0-9_-]{12,64}$")
  private val connections = ConcurrentHashMap<String, PetipyIncomingConnection>()
  private val pending = ConcurrentHashMap<String, Long>()
  private val handler = Handler(Looper.getMainLooper())
  private val timeoutCallbacks = ConcurrentHashMap<String, Runnable>()
  private val ringtoneLock = Any()
  private var ringtone: Ringtone? = null
  private var ringtoneTimeout: Runnable? = null

  fun registerPhoneAccount(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
    val telecom = context.getSystemService(TelecomManager::class.java) ?: return false
    telecom.registerPhoneAccount(
      PhoneAccount.builder(phoneAccountHandle(context), "Petipy Consultant")
        .setCapabilities(PhoneAccount.CAPABILITY_SELF_MANAGED)
        .setShortDescription("Petipy voice consultations")
        .addSupportedUriScheme("sip")
        .build(),
    )
    return true
  }

  fun addIncomingCall(
    context: Context,
    callId: String,
    expiresAtMillis: Long?,
  ): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || !callIdPattern.matches(callId)) {
      return false
    }
    if (connections.containsKey(callId)) return true

    val nowElapsed = SystemClock.elapsedRealtime()
    val previous = pending.putIfAbsent(callId, nowElapsed)
    if (previous != null) {
      if (nowElapsed - previous < PENDING_TTL_MS) return true
      pending.replace(callId, previous, nowElapsed)
    }

    val remaining = callTimeout(expiresAtMillis)
    if (remaining <= 0L) {
      pending.remove(callId)
      return false
    }

    try {
      registerPhoneAccount(context)
      val extras =
        Bundle().apply {
          putString(EXTRA_CALL_ID, callId)
          putParcelable(
            TelecomManager.EXTRA_INCOMING_CALL_ADDRESS,
            Uri.fromParts("sip", "petipy", null),
          )
        }
      val telecom =
        context.getSystemService(TelecomManager::class.java) ?: run {
          pending.remove(callId)
          return false
        }
      telecom.addNewIncomingCall(phoneAccountHandle(context), extras)
      scheduleTimeout(callId, remaining)
      return true
    } catch (error: Exception) {
      pending.remove(callId)
      throw error
    }
  }

  fun attachConnection(callId: String, connection: PetipyIncomingConnection): Boolean {
    pending.remove(callId)
    val previous = connections.putIfAbsent(callId, connection)
    return previous == null
  }

  fun markCallActive(callId: String): Boolean {
    clearTimeout(callId)
    val connection = connections[callId] ?: return false
    connection.markActiveFromApp()
    stopRingtone()
    return true
  }

  fun endCall(callId: String, reason: String): Boolean {
    clearTimeout(callId)
    pending.remove(callId)
    val connection = connections.remove(callId) ?: run {
      stopRingtone()
      return false
    }
    connection.finishFromApp(reason)
    stopRingtone()
    return true
  }

  fun endAllCalls(reason: String): Boolean {
    val callIds = (connections.keys + pending.keys).toSet()
    callIds.forEach { endCall(it, reason) }
    stopRingtone()
    return true
  }

  fun removeConnection(callId: String, connection: PetipyIncomingConnection) {
    connections.remove(callId, connection)
    pending.remove(callId)
    clearTimeout(callId)
  }

  fun startRingtone(context: Context, expiresAtMillis: Long?): Boolean {
    synchronized(ringtoneLock) {
      val active = ringtone
      if (active == null || !active.isPlaying) {
        val sound =
          RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            ?: return false
        val next = RingtoneManager.getRingtone(context.applicationContext, sound) ?: return false
        next.audioAttributes =
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
          next.isLooping = true
        }
        next.play()
        ringtone = next
      }

      ringtoneTimeout?.let(handler::removeCallbacks)
      val timeout =
        Runnable {
          stopRingtone()
        }
      ringtoneTimeout = timeout
      handler.postDelayed(timeout, callTimeout(expiresAtMillis).coerceAtLeast(1_000L))
      return true
    }
  }

  fun stopRingtone() {
    synchronized(ringtoneLock) {
      ringtoneTimeout?.let(handler::removeCallbacks)
      ringtoneTimeout = null
      ringtone?.stop()
      ringtone = null
    }
  }

  private fun scheduleTimeout(callId: String, delayMs: Long) {
    clearTimeout(callId)
    val callback =
      Runnable {
        endCall(callId, "missed")
      }
    timeoutCallbacks[callId] = callback
    handler.postDelayed(callback, delayMs)
  }

  private fun clearTimeout(callId: String) {
    timeoutCallbacks.remove(callId)?.let(handler::removeCallbacks)
  }

  private fun phoneAccountHandle(context: Context) =
    PhoneAccountHandle(
      ComponentName(context, PetipyTelecomConnectionService::class.java),
      PHONE_ACCOUNT_ID,
    )

  private fun callTimeout(expiresAtMillis: Long?): Long {
    if (expiresAtMillis == null) return MAX_RING_MS
    return (expiresAtMillis - System.currentTimeMillis()).coerceIn(0L, MAX_RING_MS)
  }
}

class PetipyTelecomConnectionService : ConnectionService() {
  override fun onCreateIncomingConnection(
    connectionManagerPhoneAccount: PhoneAccountHandle,
    request: ConnectionRequest,
  ): Connection {
    val callId = request.extras?.getString(PetipyTelecomCallState.EXTRA_CALL_ID)
    if (callId.isNullOrBlank()) {
      return Connection.createFailedConnection(DisconnectCause(DisconnectCause.ERROR))
    }

    val connection = PetipyIncomingConnection(applicationContext, callId)
    if (!PetipyTelecomCallState.attachConnection(callId, connection)) {
      return Connection.createFailedConnection(DisconnectCause(DisconnectCause.ERROR))
    }
    return connection
  }

  override fun onCreateIncomingConnectionFailed(
    connectionManagerPhoneAccount: PhoneAccountHandle,
    request: ConnectionRequest,
  ) {
    request.extras?.getString(PetipyTelecomCallState.EXTRA_CALL_ID)?.let {
      PetipyTelecomCallState.endCall(it, "missed")
    }
  }
}

internal class PetipyIncomingConnection(
  private val appContext: Context,
  private val callId: String,
) : Connection() {
  init {
    setConnectionProperties(Connection.PROPERTY_SELF_MANAGED)
    setCallerDisplayName("Petipy", TelecomManager.PRESENTATION_ALLOWED)
    setAddress(Uri.fromParts("sip", "petipy", null), TelecomManager.PRESENTATION_ALLOWED)
    setAudioModeIsVoip(true)
    setVideoState(VideoProfile.STATE_AUDIO_ONLY)
    setRinging()
  }

  override fun onShowIncomingCallUi() {
    // The verified request has already been presented through the CallStyle notification.
  }

  override fun onAnswer() {
    dispatchToApp("answer")
  }

  override fun onReject() {
    dispatchToApp("reject")
  }

  override fun onDisconnect() {
    dispatchToApp(if (state == STATE_RINGING) "reject" else "hangup")
  }

  override fun onAbort() {
    finishFromApp("missed")
  }

  fun markActiveFromApp() {
    if (state != STATE_DISCONNECTED) setActive()
  }

  fun finishFromApp(reason: String) {
    if (state != STATE_DISCONNECTED) {
      val code =
        when (reason) {
          "rejected" -> DisconnectCause.REJECTED
          "missed" -> DisconnectCause.MISSED
          "remote" -> DisconnectCause.REMOTE
          else -> DisconnectCause.LOCAL
        }
      setDisconnected(DisconnectCause(code))
      destroy()
    }
    PetipyTelecomCallState.removeConnection(callId, this)
  }

  private fun dispatchToApp(action: String) {
    val target = if (action == "hangup") "call" else "incoming-call"
    val intent =
      Intent(appContext, MainActivity::class.java).apply {
        this.action = Intent.ACTION_VIEW
        data = Uri.parse("petipy-consultant://$target/${Uri.encode(callId)}?action=$action")
        addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_CLEAR_TOP or
            Intent.FLAG_ACTIVITY_SINGLE_TOP,
        )
      }
    try {
      appContext.startActivity(intent)
    } catch (_: Exception) {
      // The CallStyle notification remains available if Android blocks background activity launch.
    }
  }
}
