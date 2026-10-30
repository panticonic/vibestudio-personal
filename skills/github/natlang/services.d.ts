declare module "natlang:services" {
  /** Resolve which stored credential would serve a URL: a secret-free summary, or null when none is bound. */
  export namespace credentials {
    function resolveCredential(input: {
      url?: string;
      providerId?: string;
      credentialId?: string;
      credentialLabel?: string;
      use?: "fetch" | "publish" | "git-http" | "git-ssh";
    }): Promise<{
      id: string;
      label: string;
      scopes: string[];
      /** Set by the GitHub setup component: the access level the credential was created with. */
      metadata?: Record<string, string>;
    } | null>;
  }
}
