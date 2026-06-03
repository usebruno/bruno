param(
    [switch]$Init,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Install-CodeGraph {
    Write-Host "[信息] 正在安装 codegraph…" -ForegroundColor Cyan

    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($npm) {
        Write-Host "[信息] 通过 npm 安装 @colbymchenry/codegraph…" -ForegroundColor Cyan
        npm install -g @colbymchenry/codegraph
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[完成] codegraph 安装成功" -ForegroundColor Green
            return
        }
        Write-Host "[警告] npm 安装失败，尝试使用官方安装脚本…" -ForegroundColor Yellow
    }

    Write-Host "[信息] 通过官方脚本安装…" -ForegroundColor Cyan
    irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 | iex
    if ($LASTEXITCODE -ne 0) { throw "codegraph 安装失败" }
    Write-Host "[完成] codegraph 安装成功" -ForegroundColor Green
}

try {
    $codegraph = Get-Command codegraph -ErrorAction Stop
    Write-Host "[正常] 已检测到 codegraph CLI" -ForegroundColor Green
} catch {
    Write-Host "[提示] 未找到 codegraph，将自动安装…" -ForegroundColor Yellow
    Install-CodeGraph
}

if (-not (Test-Path ".\.codegraph")) {
    Write-Host "[警告] 未找到 .codegraph/ 目录，正在执行初始化…" -ForegroundColor Yellow
    codegraph init -i
    if ($LASTEXITCODE -ne 0) { throw "codegraph init 失败" }
    Write-Host "[完成] 初始化 + 索引构建完毕" -ForegroundColor Green
} elseif ($Init) {
    Write-Host "[信息] 正在重新初始化…" -ForegroundColor Cyan
    codegraph init -i
    if ($LASTEXITCODE -ne 0) { throw "codegraph init 失败" }
    Write-Host "[完成] 重新初始化 + 索引构建完毕" -ForegroundColor Green
} elseif ($Force) {
    Write-Host "[信息] 正在执行全量重建索引…" -ForegroundColor Cyan
    codegraph index --force
    if ($LASTEXITCODE -ne 0) { throw "codegraph index --force 失败" }
    Write-Host "[完成] 全量重建索引完毕" -ForegroundColor Green
} else {
    Write-Host "[信息] 正在执行增量同步…" -ForegroundColor Cyan
    codegraph sync
    if ($LASTEXITCODE -ne 0) { throw "codegraph sync 失败" }
    Write-Host "[完成] 增量同步完毕" -ForegroundColor Green
}

Write-Host "`n--- CodeGraph 状态 ---" -ForegroundColor Cyan
codegraph status

if ($LASTEXITCODE -ne 0) {
    Write-Host "[警告] codegraph status 返回异常" -ForegroundColor Yellow
}
