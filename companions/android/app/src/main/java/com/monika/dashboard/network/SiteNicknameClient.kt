package com.monika.dashboard.network

import com.monika.dashboard.DashboardApp
import com.monika.dashboard.isAllowedDashboardUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

/** Nickname changes are explicit device actions, never part of background heartbeats. */
class SiteNicknameClient(serverUrl: String, private val token: String) {
    init { require(isAllowedDashboardUrl(serverUrl)) { "服务器地址无效" } }
    private val endpoint = "${serverUrl.trimEnd('/')}/api/site-nickname"
    private val client = DashboardApp.httpClient.newBuilder()
        .followRedirects(false).followSslRedirects(false).build()

    fun load(): Result<String> = execute(Request.Builder().url(endpoint).get().build())

    fun save(value: String): Result<String> {
        val name = value.trim()
        if (name.isEmpty() || name.codePointCount(0, name.length) > 24 ||
            name.any { it.code < 32 || it.code == 127 }) {
            return Result.failure(IOException("昵称请填写 1 到 24 个字"))
        }
        val body = JSONObject().put("displayName", name).toString()
            .toRequestBody("application/json; charset=utf-8".toMediaType())
        return execute(Request.Builder().url(endpoint).post(body).build())
    }

    private fun execute(request: Request): Result<String> = runCatching {
        require(token.isNotBlank()) { "请先保存服务器地址和设备密钥" }
        client.newCall(request.newBuilder().header("Authorization", "Bearer $token").build())
            .execute().use { response ->
                if (!response.isSuccessful) throw IOException(when (response.code) {
                    401, 403 -> "设备密钥无效，请检查服务器配置"
                    404, 405 -> "当前服务器暂不支持昵称设置"
                    else -> "保存或读取失败，请稍后重试"
                })
                val json = try { JSONObject(response.body?.string().orEmpty()) }
                    catch (_: Exception) { throw IOException("服务器返回的内容不正确") }
                if (!json.has("displayName")) throw IOException("服务器没有返回昵称")
                if (request.method == "POST" && !json.optBoolean("ok")) {
                    throw IOException("服务器未确认保存，请重试")
                }
                json.getString("displayName")
            }
    }
}
