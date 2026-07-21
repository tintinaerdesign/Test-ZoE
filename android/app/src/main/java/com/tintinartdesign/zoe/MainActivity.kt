package com.tintinartdesign.zoe

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.ReactMarker
import com.facebook.react.bridge.ReactMarkerConstants
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper
import expo.modules.splashscreen.SplashScreenManager

class MainActivity : ReactActivity() {
  private var bundleCover: View? = null
  private var coverListener: ReactMarker.MarkerListener? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    // Must register before super.onCreate so Android splash can be dismissed from JS
    SplashScreenManager.registerOnActivity(this)
    // Hold native splash for the whole Metro/JS bundle load — only JS hideAsync() dismisses it.
    SplashScreenManager.preventAutoHideCalled = true
    setTheme(R.style.AppTheme)
    super.onCreate(null)

    // Android 14/15 debug often drops the system SplashScreen early → black RN SurfaceView.
    // A normal View overlay sits ABOVE that surface and shows yellow + app-icon until JS paints.
    installBundleSplashCover()
  }

  /**
   * Full-screen brand cover over the React root. Unlike windowBackground / SplashScreen API,
   * this View composites above SurfaceView so Metro bundling does not flash black.
   * Removed on CONTENT_APPEARED when JS StartupBridge takes over.
   */
  private fun installBundleSplashCover() {
    val content = findViewById<ViewGroup>(android.R.id.content) ?: return
    if (content.findViewById<View>(R.id.zoe_bundle_splash_cover) != null) return

    val yellow = Color.parseColor("#FFE600")
    val cover = FrameLayout(this).apply {
      id = R.id.zoe_bundle_splash_cover
      setBackgroundColor(yellow)
      elevation = 10_000f
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

    content.addView(
      cover,
      FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      ),
    )
    bundleCover = cover

    val listener = ReactMarker.MarkerListener { name, _, _ ->
      if (name == ReactMarkerConstants.CONTENT_APPEARED) {
        runOnUiThread { dismissBundleSplashCover() }
      }
    }
    coverListener = listener
    ReactMarker.addListener(listener)
  }

  private fun dismissBundleSplashCover() {
    coverListener?.let { ReactMarker.removeListener(it) }
    coverListener = null
    val cover = bundleCover ?: return
    bundleCover = null
    (cover.parent as? ViewGroup)?.removeView(cover)
  }

  override fun onDestroy() {
    dismissBundleSplashCover()
    super.onDestroy()
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which enables New Architecture with a single boolean flag [fabricEnabled].
   */
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

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
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
