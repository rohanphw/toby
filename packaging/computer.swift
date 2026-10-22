import AppKit
import CoreGraphics
let args=Array(CommandLine.arguments.dropFirst())
func fail(_ text:String)->Never{FileHandle.standardError.write(Data(text.utf8));exit(1)}
guard let action=args.first else {fail("Missing action")}
func point()->CGPoint{guard args.count>2,let x=Double(args[1]),let y=Double(args[2]) else{fail("Expected x y")};return CGPoint(x:x,y:y)}
switch action {
case "click": let p=point();CGEvent(mouseEventSource:nil,mouseType:.leftMouseDown,mouseCursorPosition:p,mouseButton:.left)?.post(tap:.cghidEventTap);CGEvent(mouseEventSource:nil,mouseType:.leftMouseUp,mouseCursorPosition:p,mouseButton:.left)?.post(tap:.cghidEventTap)
case "move": CGEvent(mouseEventSource:nil,mouseType:.mouseMoved,mouseCursorPosition:point(),mouseButton:.left)?.post(tap:.cghidEventTap)
case "type": guard args.count>1 else{fail("Missing text")};let chars=Array(args[1].utf16);let e=CGEvent(keyboardEventSource:nil,virtualKey:0,keyDown:true);e?.keyboardSetUnicodeString(stringLength:chars.count,unicodeString:chars);e?.post(tap:.cghidEventTap)
case "key": guard args.count>1,let code=UInt16(args[1]) else{fail("Expected virtual key code")};CGEvent(keyboardEventSource:nil,virtualKey:code,keyDown:true)?.post(tap:.cghidEventTap);CGEvent(keyboardEventSource:nil,virtualKey:code,keyDown:false)?.post(tap:.cghidEventTap)
case "scroll": guard args.count>1,let delta=Int32(args[1]) else{fail("Expected scroll amount")};CGEvent(scrollWheelEvent2Source:nil,units:.pixel,wheelCount:1,wheel1:delta,wheel2:0,wheel3:0)?.post(tap:.cghidEventTap)
case "describe": let script=NSAppleScript(source:"tell application \"System Events\" to get {name, title of front window} of first application process whose frontmost is true");var error:NSDictionary?;let result=script?.executeAndReturnError(&error);if let error=error{fail(error.description)};print(result?.stringValue ?? result?.description ?? "")
default:fail("Unknown computer action")
}
print("ok")
