' Windows 静默启动器 —— 双击此文件即可启动 Git 日报 AI 工作台
' 不会弹出命令行窗口

Dim WshShell, scriptDir, startScript

Set WshShell = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

startScript = scriptDir & "\scripts\start-local.mjs"

' 用 node 静默运行启动脚本，0 = 隐藏窗口，False = 不等待
WshShell.Run "node """ & startScript & """", 0, False

Set WshShell = Nothing
