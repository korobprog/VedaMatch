package com.ragagent

import android.app.PictureInPictureParams
import android.os.Build
import android.util.Rational
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

object CallPiPState {
  @Volatile
  var isCallActive: Boolean = false
}

class CallPiPModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CallPiPModule"

  @ReactMethod
  fun setCallActive(active: Boolean) {
    CallPiPState.isCallActive = active
  }

  @ReactMethod
  fun isSupported(promise: Promise) {
    promise.resolve(Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
  }

  @ReactMethod
  fun enterPiP(width: Int, height: Int, promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      promise.resolve(false)
      return
    }

    val activity = currentActivity
    if (activity == null) {
      promise.resolve(false)
      return
    }

    try {
      val safeWidth = if (width > 0) width else 9
      val safeHeight = if (height > 0) height else 16
      val params = PictureInPictureParams.Builder()
          .setAspectRatio(Rational(safeWidth, safeHeight))
          .build()
      val entered = activity.enterPictureInPictureMode(params)
      promise.resolve(entered)
    } catch (_: Throwable) {
      promise.resolve(false)
    }
  }
}
