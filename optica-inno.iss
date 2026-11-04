; Instalador de OpticaApp con Inno Setup 6.
;
; Compilar con:
;   "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" optica-inno.iss
;
; Requiere que la app ya esté empaquetada en dist\win-unpacked (npm run build:dir).
; El instalador no toca %APPDATA%\optica_app, así que actualizar no borra los
; pacientes. Si encuentra la base de la versión anterior en la carpeta de
; instalación, la copia a %APPDATA%\optica_app antes de reemplazar archivos.

#define MyAppName "OpticaApp"
; El script de npm pasa la versión de package.json; si se compila a mano, se
; usa este valor.
#ifndef MyAppVersion
  #define MyAppVersion "1.2.0"
#endif
#define MyAppPublisher "Daniel RoMo DEV"
#define MyAppExeName "OpticaApp.exe"
#define Origen "dist\win-unpacked"

[Setup]
AppId={{6E8B0C4E-9F1A-4D3B-8C7E-2A5F1D9B4C60}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
DisableWelcomePage=no
OutputDir=dist
OutputBaseFilename=OpticaApp Setup {#MyAppVersion}
SetupIconFile=images\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
; Permite instalar solo para el usuario actual con /CURRENTUSER, sin pedir
; administrador. Sin ese parámetro, el instalador pide elevación como siempre.
PrivilegesRequiredOverridesAllowed=commandline
CloseApplications=yes
RestartApplications=no
SetupLogging=yes
MinVersion=10.0

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear un acceso directo en el escritorio"; GroupDescription: "Accesos directos:"

[Files]
Source: "{#Origen}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Desinstalar {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Abrir {#MyAppName}"; Flags: nowait postinstall skipifsilent

[Code]
// Copia la base de datos de la instalación anterior a la carpeta de datos del
// usuario, solo si todavía no existe una base nueva. La app vuelve a migrar el
// esquema al arrancar, así que la copia puede ser de una versión vieja.
procedure CopiarBaseAnterior();
var
  Origen, Destino: String;
begin
  Destino := ExpandConstant('{userappdata}\optica_app\optica.db');
  if FileExists(Destino) then
    Exit;

  Origen := ExpandConstant('{app}\resources\app\db\optica.db');
  if not FileExists(Origen) then
    Origen := ExpandConstant('{app}\db\optica.db');
  if not FileExists(Origen) then
    Exit;

  if not ForceDirectories(ExtractFileDir(Destino)) then
  begin
    MsgBox('No se pudo crear la carpeta de datos de OpticaApp.' + #13#10 +
           'Después de instalar, use Pacientes > Importar datos para cargar ' +
           'la base anterior.', mbError, MB_OK);
    Exit;
  end;

  if not CopyFile(Origen, Destino, False) then
    MsgBox('No se pudo copiar la base de datos anterior.' + #13#10 +
           'Después de instalar, use Pacientes > Importar datos y seleccione:' + #13#10 +
           Origen, mbError, MB_OK);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssInstall then
    CopiarBaseAnterior();
end;
