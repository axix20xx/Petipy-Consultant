package com.petipy.consultant

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Person
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.Icon
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

class PetipyFullScreenAccessModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "PetipyFullScreenAccess"

  @ReactMethod
  fun canUseFullScreenIntent(promise: Promise) {
    try {
      val allowed =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
          val manager = reactContext.getSystemService(NotificationManager::class.java)
          manager.canUseFullScreenIntent()
        } else {
          true
        }
      promise.resolve(allowed)
    } catch (error: Exception) {
      promise.reject("FULL_SCREEN_ACCESS_CHECK_FAILED", error)
    }
  }

  @ReactMethod
  fun openFullScreenIntentSettings(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        val intent =
          Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
            data = Uri.parse("package:${reactContext.packageName}")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
        reactContext.startActivity(intent)
      }
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("FULL_SCREEN_SETTINGS_OPEN_FAILED", error)
    }
  }

  @ReactMethod
  fun prepareIncomingCallChannel(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val manager = reactContext.getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CALL_CHANNEL_ID) == null) {
          val channel =
            NotificationChannel(
              CALL_CHANNEL_ID,
              "تماس‌های ورودی مشاوره",
              NotificationManager.IMPORTANCE_HIGH,
            ).apply {
              description = "اعلان و زنگ درخواست تماس مشاوره"
              lockscreenVisibility = Notification.VISIBILITY_PUBLIC
              enableVibration(true)
              setSound(
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
                AudioAttributes.Builder()
                  .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                  .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                  .build(),
              )
            }
          manager.createNotificationChannel(channel)
        }
      }
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("CALL_CHANNEL_SETUP_FAILED", error)
    }
  }

  @ReactMethod
  fun registerSystemPhoneAccount(promise: Promise) {
    try {
      promise.resolve(PetipyTelecomCallState.registerPhoneAccount(reactContext))
    } catch (error: Exception) {
      promise.reject("TELECOM_ACCOUNT_REGISTER_FAILED", error)
    }
  }

  @ReactMethod
  fun addSystemIncomingCall(
    callId: String,
    expiresAtMillis: Double?,
    promise: Promise,
  ) {
    try {
      if (!CALL_ID_PATTERN.matches(callId)) {
        promise.reject("INVALID_CALL_ID", "The call ID is invalid.")
        return
      }
      val expiry = expiresAtMillis?.takeIf { it.isFinite() }?.toLong()
      promise.resolve(PetipyTelecomCallState.addIncomingCall(reactContext, callId, expiry))
    } catch (error: Exception) {
      promise.reject("TELECOM_INCOMING_CALL_FAILED", error)
    }
  }

  @ReactMethod
  fun markSystemCallActive(callId: String, promise: Promise) {
    try {
      promise.resolve(PetipyTelecomCallState.markCallActive(callId))
    } catch (error: Exception) {
      promise.reject("TELECOM_CALL_ACTIVATE_FAILED", error)
    }
  }

  @ReactMethod
  fun endSystemCall(
    callId: String,
    reason: String,
    promise: Promise,
  ) {
    try {
      promise.resolve(PetipyTelecomCallState.endCall(callId, reason))
    } catch (error: Exception) {
      promise.reject("TELECOM_CALL_END_FAILED", error)
    }
  }

  @ReactMethod
  fun endAllSystemCalls(reason: String, promise: Promise) {
    try {
      promise.resolve(PetipyTelecomCallState.endAllCalls(reason))
    } catch (error: Exception) {
      promise.reject("TELECOM_CALLS_END_FAILED", error)
    }
  }

  @ReactMethod
  fun startNativeIncomingRingtone(
    expiresAtMillis: Double?,
    promise: Promise,
  ) {
    try {
      val expiry = expiresAtMillis?.takeIf { it.isFinite() }?.toLong()
      promise.resolve(PetipyTelecomCallState.startRingtone(reactContext, expiry))
    } catch (error: Exception) {
      promise.reject("CALL_RINGTONE_START_FAILED", error)
    }
  }

  @ReactMethod
  fun stopNativeIncomingRingtone(promise: Promise) {
    try {
      PetipyTelecomCallState.stopRingtone()
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("CALL_RINGTONE_STOP_FAILED", error)
    }
  }

  @ReactMethod
  fun showIncomingCallNotification(
    callId: String,
    expiresAtMillis: Double?,
    promise: Promise,
  ) {
    try {
      if (!CALL_ID_PATTERN.matches(callId)) {
        promise.reject("INVALID_CALL_ID", "The call ID is invalid.")
        return
      }

      val manager = reactContext.getSystemService(NotificationManager::class.java)
      if (!manager.areNotificationsEnabled()) {
        promise.resolve(false)
        return
      }
      ensureCallChannel(manager)

      val openIntent = callActionIntent(callId, "open")
      val answerIntent = callActionIntent(callId, "answer")
      val rejectIntent = callActionIntent(callId, "reject")
      val builder =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          Notification.Builder(reactContext, CALL_CHANNEL_ID)
        } else {
          Notification.Builder(reactContext)
        }

      builder
        .setSmallIcon(R.mipmap.ic_launcher)
        .setColor(Color.rgb(107, 63, 225))
        .setCategory(Notification.CATEGORY_CALL)
        .setVisibility(Notification.VISIBILITY_PUBLIC)
        .setContentTitle("تماس ورودی Petipy")
        .setContentText("درخواست مشاوره جدید دارید")
        .setContentIntent(openIntent)
        .setFullScreenIntent(openIntent, true)
        .setOngoing(true)
        .setAutoCancel(false)
        .setShowWhen(false)
        .setTicker("تماس ورودی مشاوره")

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val caller = Person.Builder().setName("Petipy").setImportant(true).build()
        builder.setStyle(
          Notification.CallStyle.forIncomingCall(
            caller,
            rejectIntent,
            answerIntent,
          ),
        )
      } else {
        builder
          .setPriority(Notification.PRIORITY_MAX)
          .addAction(
            Notification.Action.Builder(
              Icon.createWithResource(reactContext, R.mipmap.ic_launcher),
              "رد تماس",
              rejectIntent,
            ).build(),
          )
          .addAction(
            Notification.Action.Builder(
              Icon.createWithResource(reactContext, R.mipmap.ic_launcher),
              "پاسخ",
              answerIntent,
            ).build(),
          )
      }

      val timeoutMillis = parseExpiryTimeout(expiresAtMillis)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && timeoutMillis > 0) {
        builder.setTimeoutAfter(timeoutMillis)
      }

      manager.notify(notificationTag(callId), NOTIFICATION_ID, builder.build())
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("CALL_NOTIFICATION_FAILED", error)
    }
  }

  @ReactMethod
  fun cancelIncomingCallNotification(callId: String, promise: Promise) {
    try {
      reactContext
        .getSystemService(NotificationManager::class.java)
        .cancel(notificationTag(callId), NOTIFICATION_ID)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("CALL_NOTIFICATION_CANCEL_FAILED", error)
    }
  }

  @ReactMethod
  fun cancelAllIncomingCallNotifications(promise: Promise) {
    try {
      val manager = reactContext.getSystemService(NotificationManager::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        manager.activeNotifications
          .filter { it.tag?.startsWith(NOTIFICATION_TAG_PREFIX) == true }
          .forEach { manager.cancel(it.tag, it.id) }
      }
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("CALL_NOTIFICATIONS_CANCEL_FAILED", error)
    }
  }

  private fun ensureCallChannel(manager: NotificationManager) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
      manager.getNotificationChannel(CALL_CHANNEL_ID) == null
    ) {
      val channel =
        NotificationChannel(
          CALL_CHANNEL_ID,
          "تماس‌های ورودی مشاوره",
          NotificationManager.IMPORTANCE_HIGH,
        ).apply {
          description = "اعلان و زنگ درخواست تماس مشاوره"
          lockscreenVisibility = Notification.VISIBILITY_PUBLIC
          enableVibration(true)
          setSound(
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
            AudioAttributes.Builder()
              .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
              .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
              .build(),
          )
        }
      manager.createNotificationChannel(channel)
    }
  }

  private fun callActionIntent(callId: String, action: String): PendingIntent {
    val intent =
      Intent(reactContext, MainActivity::class.java).apply {
        this.action = Intent.ACTION_VIEW
        data = Uri.parse("petipy-consultant://incoming-call/$callId?action=$action")
        addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_CLEAR_TOP or
            Intent.FLAG_ACTIVITY_SINGLE_TOP,
        )
      }
    val requestCode = callId.hashCode() xor action.hashCode()
    val flags =
      PendingIntent.FLAG_UPDATE_CURRENT or
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          PendingIntent.FLAG_IMMUTABLE
        } else {
          0
        }
    return PendingIntent.getActivity(reactContext, requestCode, intent, flags)
  }

  private fun parseExpiryTimeout(expiresAtMillis: Double?): Long {
    if (expiresAtMillis == null || !expiresAtMillis.isFinite()) return 90_000L
    val remaining = expiresAtMillis.toLong() - System.currentTimeMillis()
    return remaining.coerceIn(0L, 90_000L)
  }

  private fun notificationTag(callId: String) = "$NOTIFICATION_TAG_PREFIX$callId"

  private companion object {
    const val CALL_CHANNEL_ID = "incoming-calls-v2"
    const val NOTIFICATION_TAG_PREFIX = "petipy-call-"
    const val NOTIFICATION_ID = 1
    val CALL_ID_PATTERN = Regex("^[A-Za-z0-9_-]{12,64}$")
  }
}

class PetipyFullScreenAccessPackage : ReactPackage {
  override fun createNativeModules(
    reactContext: ReactApplicationContext,
  ): List<NativeModule> = listOf(PetipyFullScreenAccessModule(reactContext))

  override fun createViewManagers(
    reactContext: ReactApplicationContext,
  ): List<ViewManager<*, *>> = emptyList()
}
