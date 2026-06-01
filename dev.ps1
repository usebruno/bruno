param(
    [Parameter(Position = 0)]
    [ValidateSet('dev', 'web', 'debug', 'watch', 'setup')]
    [string]$Mode = 'debug',

    [switch]$SkipChecks,
    [switch]$Help
)

$ErrorActionPreference = 'Continue'
$script:RootDir = $PSScriptRoot

function Write-Info($msg) {
    Write-Host "[信息] $msg" -ForegroundColor Cyan
}
function Write-Success($msg) {
    Write-Host "[完成] $msg" -ForegroundColor Green
}
function Write-Warn($msg) {
    Write-Host "[警告] $msg" -ForegroundColor Yellow
}
function Write-Err($msg) {
    Write-Host "[错误] $msg" -ForegroundColor Red
}
function Write-Step($msg) {
    Write-Host "`n>>> $msg <<<" -ForegroundColor Magenta
}

function Show-Help {
    Write-Host @"
Bruno 一键启动开发脚本

用法:
    .\dev.ps1 [Mode] [-SkipChecks]

参数:
    Mode        运行模式: dev | web | debug | watch | setup (默认 debug)
    -SkipChecks 跳过环境检查（Node.js 版本 / node_modules 检测）

模式说明:
    dev     Web 前端 + Electron 桌面窗口一键启动
    web     仅启动 Web Dev Server (localhost:3000)
    debug   (默认) Electron 调试模式 (--inspect=9229，可用 Chrome DevTools 连接)
    watch   热重载模式（自动监听子包变更，无需手动重启）
    setup   仅执行项目初始化（下载依赖 + 构建子包）

示例:
    .\dev.ps1              # 默认：Electron 调试模式
    .\dev.ps1 dev          # 普通开发模式
    .\dev.ps1 web          # 仅前端
    .\dev.ps1 watch        # 热重载
    .\dev.ps1 -SkipChecks  # 跳过环境检查
    .\dev.ps1 setup        # 重新初始化项目
"@
}

if ($Help) { Show-Help; exit 0 }

# ============================================================
# 环境检查
# ============================================================
function Test-NodeVersion {
    $nvmrcPath = Join-Path $script:RootDir '.nvmrc'
    if (-not (Test-Path $nvmrcPath)) {
        Write-Warn '未找到 .nvmrc 文件，跳过 Node.js 版本检查'
        return $true
    }
    $expected = (Get-Content $nvmrcPath).Trim() -replace '^v', ''
    try {
        $current = (node -v 2>&1).Trim() -replace '^v', ''
    }
    catch {
        Write-Err 'Node.js 未安装或不在 PATH 中'
        return $false
    }

    Write-Info "Node.js 版本: 当前 v$current | 项目要求 v$expected"

    $currentMajor = [int]($current -split '\.')[0]
    $expectedMajor = [int]($expected -split '\.')[0]

    if ($currentMajor -ne $expectedMajor) {
        Write-Warn "Node.js 主版本不匹配 (v$currentMajor vs v$expectedMajor)"
        Write-Warn "建议执行: nvm use $expected"
        return $false
    }
    return $true
}

function Test-NpmAvailable {
    try {
        $null = Get-Command npm -ErrorAction Stop
        return $true
    }
    catch {
        Write-Err 'npm 未安装或不在 PATH 中'
        return $false
    }
}

function Test-NodeModules {
    $appModules = Join-Path $script:RootDir 'packages\bruno-app\node_modules'
    if (-not (Test-Path $appModules)) {
        Write-Warn '未检测到 node_modules，需要先执行 npm run setup'
        $choice = Read-Host '是否立即执行? (y/n)'
        if ($choice -eq 'y' -or $choice -eq 'Y') {
            Invoke-Setup
            return $true
        }
        Write-Err '缺少项目依赖，请执行: .\dev.ps1 setup'
        return $false
    }
    Write-Info 'node_modules 已就绪'
    return $true
}

# ============================================================
# 各模式实现
# ============================================================
function Invoke-Setup {
    Write-Step '项目初始化: npm run setup'
    Write-Info '这可能需要几分钟，请耐心等待...'
    Push-Location $script:RootDir
    try {
        npm run setup
        if ($LASTEXITCODE -ne 0) {
            Write-Err 'npm run setup 失败 (code: ' + $LASTEXITCODE + ')'
            return
        }
        Write-Success '项目初始化完成'
    }
    finally {
        Pop-Location
    }
}

function Start-DevNormal {
    Write-Step '开发模式: Web + Electron'
    Write-Info '前端地址: http://localhost:3000'
    Write-Info '按 Ctrl+C 停止所有进程'
    Push-Location $script:RootDir
    try {
        npm run dev
    }
    finally {
        Pop-Location
    }
}

function Start-DevWeb {
    Write-Step '开发模式: 仅前端'
    Write-Info '前端地址: http://localhost:3000'
    Write-Info '按 Ctrl+C 停止服务'
    Push-Location $script:RootDir
    try {
        npm run dev:web
    }
    finally {
        Pop-Location
    }
}

function Start-DevDebug {
    Write-Step '调试模式: Electron --inspect'
    Write-Info 'Web Dev Server → 端口 3000'
    Write-Info 'Electron → --inspect=9229 (chrome://inspect 连接)'
    Write-Info '按 Ctrl+C 停止所有进程'

    $webDir = Join-Path $script:RootDir 'packages\bruno-app'
    $electronDir = Join-Path $script:RootDir 'packages\bruno-electron'

    Write-Info '启动 Web Dev Server...'
    $webJob = Start-Job -Name 'BrunoWeb' -ScriptBlock {
        param($d); Set-Location $d; npm run dev 2>&1 | ForEach-Object { Write-Output $_ }
    } -ArgumentList $webDir

    Write-Info '等待端口 3000 就绪...'
    $portReady = $false
    $startTime = Get-Date

    while (-not $portReady -and ((Get-Date) - $startTime).TotalSeconds -lt 90) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect('127.0.0.1', 3000)
            $tcp.Close()
            $tcp.Dispose()
            $portReady = $true
        }
        catch {
            Start-Sleep -Seconds 2
        }
    }

    if (-not $portReady) {
        Write-Err 'Web Dev Server 启动超时 (90s)，请检查 npm run dev:web 是否能正常运行'
        $webJob | Stop-Job -ErrorAction SilentlyContinue
        $webJob | Remove-Job -ErrorAction SilentlyContinue
        return
    }

    Write-Success 'Web 服务已启动在端口 3000'

    Write-Info '启动 Electron (debug 模式)...'
    $env:BRUNO_DEV_PORT = '3000'
    Push-Location $electronDir
    try {
        npm run debug
    }
    finally {
        Pop-Location
        $webJob | Stop-Job -ErrorAction SilentlyContinue
        $webJob | Remove-Job -ErrorAction SilentlyContinue
    }
}

function Start-DevWatch {
    Write-Step '热重载模式: npm run dev:watch'
    Write-Info '自动监听 packages/ 子包变更，无需手动重启'
    Write-Info '按 Ctrl+C 停止所有进程'
    Push-Location $script:RootDir
    try {
        npm run dev:watch
    }
    finally {
        Pop-Location
    }
}

# ============================================================
# 主流程
# ============================================================
Write-Host ''
Write-Host '  Bruno Dev Launcher ' -ForegroundColor Yellow
Write-Host ''

try {
    if (-not $SkipChecks) {
        $npmOk = Test-NpmAvailable
        if (-not $npmOk) { exit 1 }

        $nodeOk = Test-NodeVersion
        if (-not $nodeOk) {
            $choice = Read-Host '是否忽略版本差异继续? (y/n)'
            if ($choice -ne 'y' -and $choice -ne 'Y') { exit 1 }
        }

        if ($Mode -ne 'setup') {
            $modulesOk = Test-NodeModules
            if (-not $modulesOk) { exit 1 }
        }
    }
    else {
        Write-Info '已跳过环境检查 (-SkipChecks)'
    }

    switch ($Mode) {
        'setup'  { Invoke-Setup }
        'dev'    { Start-DevNormal }
        'web'    { Start-DevWeb }
        'debug'  { Start-DevDebug }
        'watch'  { Start-DevWatch }
    }
}
catch {
    Write-Err "脚本异常: $_"
    Write-Err "错误位置: $($_.InvocationInfo.PositionMessage)"
    exit 1
}
