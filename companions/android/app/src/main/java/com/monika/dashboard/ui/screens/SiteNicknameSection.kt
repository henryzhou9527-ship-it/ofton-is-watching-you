package com.monika.dashboard.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.monika.dashboard.data.SettingsStore
import com.monika.dashboard.network.SiteNicknameClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.coroutines.cancellation.CancellationException

@Composable
fun SiteNicknameSection(settings: SettingsStore) {
    val scope = rememberCoroutineScope()
    val serverUrl by settings.serverUrl.collectAsState(initial = "")
    val latestServerUrl by rememberUpdatedState(serverUrl)
    var nickname by remember(serverUrl) { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var message by remember(serverUrl) { mutableStateOf<String?>(null) }

    suspend fun request(save: Boolean) {
        if (busy) return
        val targetUrl = serverUrl
        val requestedName = nickname
        busy = true
        message = null
        try {
            val result = withContext(Dispatchers.IO) {
                require(SettingsStore.validateUrl(targetUrl)) { "请先保存服务器地址和设备密钥" }
                val token = settings.getToken().orEmpty()
                require(token.isNotBlank()) { "请先保存服务器地址和设备密钥" }
                val client = SiteNicknameClient(targetUrl, token)
                if (save) client.save(requestedName) else client.load()
            }
            if (latestServerUrl != targetUrl) return
            result.fold(onSuccess = {
                nickname = it
                message = if (save) "已保存，网站会自动更新" else "已读取网站昵称"
            }, onFailure = { message = it.message ?: "连接失败，请稍后重试" })
        } catch (e: CancellationException) { throw e }
        catch (e: Exception) { message = e.message ?: "连接失败，请稍后重试" }
        finally { busy = false }
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Divider()
        Text("网站昵称", style = MaterialTheme.typography.titleLarge)
        OutlinedTextField(
            value = nickname,
            onValueChange = { nickname = it; message = null },
            label = { Text("昵称") },
            placeholder = { Text("网站上显示的名字") },
            enabled = !busy,
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(enabled = !busy && nickname.isNotBlank(), onClick = { scope.launch { request(true) } }) {
                Text(if (busy) "处理中" else "保存昵称")
            }
            TextButton(enabled = !busy, onClick = { scope.launch { request(false) } }) {
                Text("读取当前昵称")
            }
        }
        message?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
        Divider()
    }
}
