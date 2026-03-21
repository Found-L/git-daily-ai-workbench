' Windows 静默停止器 —— 双击此文件即可停止 Git 日报 AI 工作台

Dim WshShell, scriptDir, stopScript

Set WshShell = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

stopScript = scriptDir & "\scripts\stop-local.mjs"

WshShell.Run "node """ & stopScript & """", 0, False

Set WshShell = Nothing
