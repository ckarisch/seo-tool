export interface User {
    id: string,
    name: string,
    email: string,
    password: string,
    salt: string,
    role: string,
    domains: any[],
    notificationContacts: any[]
}

export const defaultUserState: Partial<User> = {
  id: '',
  name: '',
  role: ''
};
