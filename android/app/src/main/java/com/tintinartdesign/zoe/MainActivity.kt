package com.tintinartdesign.zoe

import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper
import expo.modules.splashscreen.SplashScreenManager

/**
 * Holds a WindowManager overlay (above RN SurfaceView) so the sequence
 * system-splash → black gap → JS bridge never flashes a different color.
 *
 * A normal View inside android.R.id.content sits UNDER Fabric SurfaceView,
 * so it cannot cover the gap. WindowManager panel can.
 */
class MainActivity : ReactActivity() {
  private var windowCover: View? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    SplashScreenManager.registerOnActivity(this)
    SplashScreenManager.preventAutoHideCalled = true
    setTheme(R.style.AppTheme)
    super.onCreate(null)

    val yellow = Color.parseColor("#FFE600")
    window.decorView.setBackgroundColor(yellow)

    // Token may be null until the window is attached — retry on next frame.
    window.decorView.post { installWindowSplashCover() }
  }

  private fun installWindowSplashCover() {
    if (windowCover != null || isFinishing) return

    val token = window.decorView.windowToken
    if (token == null) {
      window.decorView.post { installWindowSplashCover() }
      return
    }

    val yellow = Color.parseColor("#FFE600")
    val cover = FrameLayout(this).apply {
      setBackgroundColor(yellow)
      isClickable = true
      importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
    }

    val icon = ImageView(this).apply {
      setImageResource(R.drawable.zoe_splash_full)
      scaleType = ImageView.ScaleType.FIT_CENTER
      adjustViewBounds = true
    }
    val iconSize = (resources.displayMetrics.widthPixels * 0.42f).toInt().coerceAtMost(
      (220 * resources.displayMetrics.density).toInt(),
    )
    cover.addView(
      icon,
      FrameLayout.LayoutParams(iconSize, iconSize, Gravity.CENTER),
    )

    val lp = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.TYPE_APPLICATION_PANEL,
      (
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
          or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
          or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
          or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        ),
      PixelFormat.OPAQUE,
    ).apply {
      this.token = token
      gravity = Gravity.TOP or Gravity.START
      title = "ZoeSplashCover"
    }

    try {
      windowManager.addView(cover, lp)
      windowCover = cover
    } catch (_: Exception) {
      // Retry once if the window was mid-transition.
      window.decorView.postDelayed({ installWindowSplashCover() }, 16L)
    }
  }

  /** Called from JS (ZoeSplashCover.dismiss) when Home is ready under the JS bridge. */
  fun dismissSplashCover() {
    val cover = windowCover ?: return
    windowCover = null
    try {
      windowManager.removeViewImmediate(cover)
    } catch (_: Exception) {
      try {
        windowManager.removeView(cover)
      } catch (_: Exception) {
        // Already removed.
      }
    }
  }

  override fun onDestroy() {
    dismissSplashCover()
    super.onDestroy()
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      super.invokeDefaultOnBackPressed()
  }
}
