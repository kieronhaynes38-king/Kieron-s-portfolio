Option Explicit

Dim shell, fso, root, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & root & "\serve.ps1"" -Port 4173"

shell.CurrentDirectory = root
shell.Run command, 0, False
