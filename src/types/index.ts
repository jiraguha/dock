export interface SshServerConfig {
  maxStartups: string;
  maxSessions: number;
}

export interface Config {
  scwAccessKey: string;
  scwSecretKey: string;
  scwProjectId: string;
  sshPublicKeyPath: string;
  sshPrivateKeyPath: string;
  region: string;
  zone: string;
  instanceType: string;
  instanceImage: string;
  instanceName: string;
  kubernetesEngine: "k3s" | "kind";
  useReservedIp: boolean;
  forwardPorts: number[];
  sshServerConfig: SshServerConfig;
}

export type StateType =
  | "absent"
  | "provisioning"
  | "running"
  | "stopped"
  | "destroyed";

export interface StateDetails {
  ip?: string;
  instanceId?: string;
  sshCommand?: string;
  dockerHost?: string;
  zone?: string;
}

export interface EnvironmentState {
  state: StateType;
  details: StateDetails | null;
}

export interface TerraformOutputs {
  instance_id: string;
  public_ip: string;
  ssh_user: string;
  ssh_key_path: string;
  ssh_command: string;
  docker_host: string;
  instance_state: string;
  kubernetes_engine: string;
  zone: string;
}

export interface TerraformVars {
  scw_access_key: string;
  scw_secret_key: string;
  scw_project_id: string;
  ssh_public_key_path?: string;
  ssh_private_key_path?: string;
  region?: string;
  zone?: string;
  instance_type?: string;
  instance_image?: string;
  instance_name?: string;
  kubernetes_engine?: string;
  use_reserved_ip?: boolean;
  snapshot_image_id?: string;
  skip_provisioning?: boolean;
}
