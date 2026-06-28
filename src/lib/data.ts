// Mock data for the PocketMCP dashboard demo
// In production this would be fetched from the MCP WebSocket server

export interface RobloxClient {
  id: string;
  name: string;
  game: string;
  placeId: string;
  executor: "Delta" | "Hydrogen" | "KRNL" | "Arceus X";
  connectedAt: string;
  ping: number;
  fps: number;
  status: "online" | "idle" | "error";
  transport: "WebSocket" | "HTTP Polling";
}

export const connectedClients: RobloxClient[] = [
  {
    id: "cli_01",
    name: "PixelWarrior_88",
    game: "Brookhaven RP",
    placeId: "4924922222",
    executor: "Delta",
    connectedAt: "il y a 4 min",
    ping: 42,
    fps: 58,
    status: "online",
    transport: "WebSocket",
  },
  {
    id: "cli_02",
    name: "ShadowNinja_X",
    game: "Arsenal",
    placeId: "286090429",
    executor: "Hydrogen",
    connectedAt: "il y a 12 min",
    ping: 67,
    fps: 60,
    status: "online",
    transport: "HTTP Polling",
  },
];

export interface LogEntry {
  time: string;
  level: "info" | "warn" | "error" | "success" | "lua";
  source: string;
  message: string;
}

export const liveLogs: LogEntry[] = [
  { time: "20:42:18", level: "success", source: "bridge", message: "Delta client connected (PixelWarrior_88)" },
  { time: "20:42:19", level: "info", source: "mcp", message: "Tool list_play() → 14 instances returned" },
  { time: "20:42:21", level: "lua", source: "exec", message: "print('hello from pocketmcp')" },
  { time: "20:42:21", level: "info", source: "stdout", message: "hello from pocketmcp" },
  { time: "20:42:24", level: "warn", source: "bridge", message: "Hydrogen client: WebSocket fallback → HTTP polling" },
  { time: "20:42:25", level: "success", source: "bridge", message: "Hydrogen client connected (ShadowNinja_X)" },
  { time: "20:42:27", level: "lua", source: "spy", message: "FireServer: BuyItem('GoldSword', 1) ×3" },
  { time: "20:42:30", level: "info", source: "mcp", message: "Tool execute_code() → 2.4ms" },
  { time: "20:42:33", level: "error", source: "exec", message: "attempt to index nil with 'Humanoid'" },
];

export interface RemoteEvent {
  name: string;
  kind: "RemoteEvent" | "RemoteFunction";
  path: string;
  fires: number;
  lastArgs: string;
}

export const remoteEvents: RemoteEvent[] = [
  { name: "BuyItem", kind: "RemoteEvent", path: "ReplicatedStorage.Remotes.BuyItem", fires: 14, lastArgs: "('GoldSword', 1)" },
  { name: "SendMessage", kind: "RemoteEvent", path: "ReplicatedStorage.Chat.Send", fires: 8, lastArgs: "('hello team')" },
  { name: "ReportPlayer", kind: "RemoteEvent", path: "ReplicatedStorage.AC.Report", fires: 2, lastArgs: "(PixelWarrior_88, 'speed')" },
  { name: "GetInventory", kind: "RemoteFunction", path: "ReplicatedStorage.Inv.Get", fires: 1, lastArgs: "()" },
  { name: "UpdatePosition", kind: "RemoteEvent", path: "ReplicatedStorage.Movement.Update", fires: 1247, lastArgs: "(Vector3 12.4, 58.2, -3.1)" },
];

export interface InstanceNode {
  name: string;
  class: string;
  children?: InstanceNode[];
}

export const instanceTree: InstanceNode = {
  name: "game",
  class: "DataModel",
  children: [
    { name: "ReplicatedStorage", class: "ReplicatedStorage", children: [
      { name: "Remotes", class: "Folder", children: [
        { name: "BuyItem", class: "RemoteEvent" },
        { name: "SendMessage", class: "RemoteEvent" },
        { name: "ReportPlayer", class: "RemoteEvent" },
      ]},
      { name: "Modules", class: "Folder", children: [
        { name: "Inventory", class: "ModuleScript" },
        { name: "Shop", class: "ModuleScript" },
      ]},
    ]},
    { name: "Players", class: "Players", children: [
      { name: "PixelWarrior_88", class: "Player" },
      { name: "ShadowNinja_X", class: "Player" },
    ]},
    { name: "Workspace", class: "Workspace", children: [
      { name: "Map", class: "Model" },
      { name: "Camera", class: "Camera" },
    ]},
  ],
};
