export interface Config {
  doToken: string;
  sshPublicKeyPath: string;
  sshPrivateKeyPath: string;
  region: string;
  dropletSize: string;
  dropletName: string;
  kubernetesEngine: "k3s" | "kind";
  useReservedIp: boolean;
}

export type StateType =
  | "absent"
  | "provisioning"
  | "running"
  | "stopped"
  | "destroyed";

export interface StateDetails {
  ip?: string;
  dropletId?: number;
  sshCommand?: string;
  dockerHost?: string;
}

export interface EnvironmentState {
  state: StateType;
  details: StateDetails | null;
}

export interface TerraformOutputs {
  droplet_id: number;
  public_ip: string;
  ssh_user: string;
  ssh_key_path: string;
  ssh_command: string;
  docker_host: string;
  droplet_status: string;
  kubernetes_engine: string;
}

export interface TerraformVars {
  do_token: string;
  ssh_public_key_path?: string;
  ssh_private_key_path?: string;
  region?: string;
  droplet_size?: string;
  droplet_name?: string;
  kubernetes_engine?: string;
  use_reserved_ip?: boolean;
}
