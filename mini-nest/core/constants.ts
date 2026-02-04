export const METADATA_TYPES = {
  INJECTABLE: 'mini:nest:injectable',
  CONTROLLER: 'mini:nest:controller',
  MODULE: 'mini:nest:module',
  ROUTES: 'mini:nest:routes',
  PARAMS: 'mini:nest:params',
  GUARDS: 'mini:nest:guards',
  PIPES: 'mini:nest:pipes',
  CONTROLLER_PREFIX: 'mini:nest:controller:prefix',
};

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
