/*
 * Copyright 2018 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

@file:Suppress(
    "unused",
    "nothing_to_inline",
    "useless_cast",
    "unchecked_cast",
    "extension_shadowed_by_member",
    "redundant_projection",
    "RemoveRedundantBackticks",
    "ObjectPropertyName",
    "deprecation",
    "detekt:all"
)
@file:org.gradle.api.Generated

package org.gradle.kotlin.dsl

import org.gradle.plugin.use.PluginDependenciesSpec
import org.gradle.plugin.use.PluginDependencySpec


/**
 * The `com` plugin group.
 */
@org.gradle.api.Generated
class `ComPluginGroup`(internal val plugins: PluginDependenciesSpec)


/**
 * Plugin ids starting with `com`.
 */
val `PluginDependenciesSpec`.`com`: `ComPluginGroup`
    get() = `ComPluginGroup`(this)


/**
 * The `com.facebook` plugin group.
 */
@org.gradle.api.Generated
class `ComFacebookPluginGroup`(internal val plugins: PluginDependenciesSpec)


/**
 * Plugin ids starting with `com.facebook`.
 */
val `ComPluginGroup`.`facebook`: `ComFacebookPluginGroup`
    get() = `ComFacebookPluginGroup`(plugins)


/**
 * The `com.facebook.react` plugin group.
 */
@org.gradle.api.Generated
class `ComFacebookReactPluginGroup`(internal val plugins: PluginDependenciesSpec)


/**
 * Plugin ids starting with `com.facebook.react`.
 */
val `ComFacebookPluginGroup`.`react`: `ComFacebookReactPluginGroup`
    get() = `ComFacebookReactPluginGroup`(plugins)


/**
 * The `com.facebook.react.settings` plugin implemented by [com.facebook.react.ReactSettingsPlugin].
 */
val `ComFacebookReactPluginGroup`.`settings`: PluginDependencySpec
    get() = plugins.id("com.facebook.react.settings")


/**
 * The `expo-autolinking-settings` plugin implemented by [expo.modules.plugin.ExpoAutolinkingSettingsPlugin].
 */
val `PluginDependenciesSpec`.`expo-autolinking-settings`: PluginDependencySpec
    get() = this.id("expo-autolinking-settings")
