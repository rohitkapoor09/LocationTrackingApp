package com.locationtracking

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.widget.Toast
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Callback

// BatteryModule.java


class BatteryModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
    private val mContext: Context

    init {
        mContext = reactContext
        registerBatteryLevelReceiver()
    }

    override fun getName(): String {
        return "BatteryModule"
    }

    @ReactMethod
    fun showToastIfLowBattery(threshold: Int) {
        if (batteryLevel < threshold) {
            Toast.makeText(mContext, "Battery is low!", Toast.LENGTH_SHORT).show()
        }
    }

    @ReactMethod
    fun getBatterLevel(callback: Callback) {
        callback.invoke(null, batteryLevel)
    }

    private val batteryLevel: Int
        get() {
            val batteryIntent =
                mContext.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val level = batteryIntent!!.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
            val scale = batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
            return (100 * level / scale.toFloat()).toInt()
        }

    private fun registerBatteryLevelReceiver() {
        val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        mContext.registerReceiver(object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
                val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
                val batteryPct = (100 * level / scale.toFloat()).toInt()
                if (batteryPct < 20) {
                    Toast.makeText(mContext, "Battery is low!", Toast.LENGTH_SHORT).show()
                }
            }
        }, filter)
    }
}