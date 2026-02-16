export type Workspace = {
  id: number;
  name: string;
  organization_id: number;
  premium: boolean;
};

export type ActiveEntry = {
  id: number;
  workspace_id: number;
  task_id: number | null;
  stop: string | null;
  duration: number;
  description: string;
  tags: string[];
  tag_ids: number[];
  user_id: number;
};

export type Tag = {
  id: number;
  name: string;
  workspace_id: number;
};
