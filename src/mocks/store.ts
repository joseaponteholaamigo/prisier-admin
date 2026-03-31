import {
  SEED_TENANTS,
  SEED_USERS,
  SEED_CONSULTOR_TENANTS,
  type MockTenant,
  type MockUser,
  type MockConsultorTenant,
} from './data'

export const store = {
  tenants: structuredClone(SEED_TENANTS) as MockTenant[],
  users: structuredClone(SEED_USERS) as MockUser[],
  consultorTenants: structuredClone(SEED_CONSULTOR_TENANTS) as MockConsultorTenant[],
  _idCounter: 100,
}
