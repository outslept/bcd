export interface PathInfo {
  path: string
  fullPath: string
  hasCompat: boolean
  children: string[]
  depth: number
}

export interface GeneratedFiles {
  typesFile: string
  proxyFile: string
  constantsFile: string
  utilsFile: string
  indexFile: string
}
