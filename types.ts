export type DreamerConfig = {
  useUUID: boolean
  useSoftDelete: boolean
  bruno?: {
    enabled: boolean
    documentsDir: string
    useAuth: boolean
  }
}

export type ExcludeUndefined<T> = T extends undefined ? never : T
