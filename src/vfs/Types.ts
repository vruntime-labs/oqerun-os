export type NodeType = "file" | "directory";

export interface VFSNode {
  name: string;
  path: string;
  type: NodeType;
  createdAt: number;
  modifiedAt: number;
}

export interface VFSFile extends VFSNode {
  type: "file";
  content: string;
}

export interface VFSDirectory extends VFSNode {
  type: "directory";
  children: string[];
}
