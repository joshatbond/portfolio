import {
  type PropsWithChildren,
  createContext,
  useReducer,
  useContext,
} from 'react'

const FormContext = createContext<
  { state: State; dispatch: Dispatch } | undefined
>(undefined)

function formReducer(state: State, action: Action) {
  switch (action.type) {
    case 'nameAssign':
      return { ...state, name: { ...state.name, value: action.payload } }
    case 'nameShow':
      return { ...state, name: { ...state.name, show: action.payload } }

    case 'streetAssign':
      return {
        ...state,
        address: {
          ...state.address,
          value: { ...state.address.value, street: action.payload },
        },
      }
    case 'cityAssign':
      return {
        ...state,
        address: {
          ...state.address,
          value: { ...state.address.value, city: action.payload },
        },
      }
    case 'stateAssign':
      return {
        ...state,
        address: {
          ...state.address,
          value: { ...state.address.value, state: action.payload },
        },
      }
    case 'zipAssign':
      return {
        ...state,
        address: {
          ...state.address,
          value: { ...state.address.value, zip: action.payload },
        },
      }
    case 'addressShow':
      return { ...state, address: { ...state.address, show: action.payload } }

    case 'emailAssign':
      return { ...state, email: { ...state.email, value: action.payload } }
    case 'emailShow':
      return { ...state, email: { ...state.email, show: action.payload } }

    case 'phoneAssign':
      return { ...state, phone: { ...state.phone, value: action.payload } }
    case 'phoneShow':
      return { ...state, phone: { ...state.phone, show: action.payload } }

    case 'positionAssign':
      return {
        ...state,
        position: { ...state.position, value: action.payload },
      }
    case 'positionShow':
      return { ...state, position: { ...state.position, show: action.payload } }
    case 'sourceAssign':
      return {
        ...state,
        source: { ...state.source, value: action.payload },
      }
    case 'sourceShow':
      return {
        ...state,
        source: { ...state.source, show: action.payload },
      }

    case 'companyNameAssign':
      return {
        ...state,
        companyName: { ...state.companyName, value: action.payload },
      }
    case 'companyNameShow':
      return {
        ...state,
        companyName: { ...state.companyName, show: action.payload },
      }

    case 'companyStreetAssign':
      return {
        ...state,
        companyAddress: {
          ...state.companyAddress,
          value: { ...state.companyAddress.value, street: action.payload },
        },
      }
    case 'companyCityAssign':
      return {
        ...state,
        companyAddress: {
          ...state.companyAddress,
          value: { ...state.companyAddress.value, city: action.payload },
        },
      }
    case 'companyStateAssign':
      return {
        ...state,
        companyAddress: {
          ...state.companyAddress,
          value: { ...state.companyAddress.value, state: action.payload },
        },
      }
    case 'companyZipAssign':
      return {
        ...state,
        companyAddress: {
          ...state.companyAddress,
          value: { ...state.companyAddress.value, zip: action.payload },
        },
      }
    case 'companyAddressShow':
      return {
        ...state,
        companyAddress: { ...state.companyAddress, show: action.payload },
      }
    default:
      throw new Error(`Unknown action type: ${action}`)
  }
}

export function FormProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(formReducer, {
    name: { value: 'Joshua Richardson', show: true },
    address: {
      value: {
        street: '6290 Castlegate Dr W, Apt 17202',
        city: 'Castle Rock',
        state: 'CO',
        zip: '80108',
      },
      show: false,
    },
    email: { value: 'josh@cursedtale.com', show: false },
    phone: { value: '+19096809275', show: false },

    position: { value: '', show: true },
    source: { value: '', show: false },
    companyName: { value: '', show: false },
    companyAddress: {
      value: { street: '', city: '', state: '', zip: '' },
      show: false,
    },
  })

  const value = { state, dispatch }

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>
}

export function useForm() {
  const context = useContext(FormContext)
  if (!context) {
    throw new Error('useForm must be used within a FormProvider')
  }

  return context
}

export type State = {
  name: Field<string>
  address: Field<Address>
  email: Field<string>
  phone: Field<string>

  position: Field<string>
  source: Field<string>
  companyName: Field<string>
  companyAddress: Field<Address>
}
export type Action =
  | { type: 'nameAssign'; payload: string }
  | { type: 'nameShow'; payload: boolean }
  | { type: 'streetAssign'; payload: string }
  | { type: 'cityAssign'; payload: string }
  | { type: 'stateAssign'; payload: string }
  | { type: 'zipAssign'; payload: string }
  | { type: 'addressShow'; payload: boolean }
  | { type: 'emailAssign'; payload: string }
  | { type: 'emailShow'; payload: boolean }
  | { type: 'phoneAssign'; payload: string }
  | { type: 'phoneShow'; payload: boolean }
  | { type: 'positionAssign'; payload: string }
  | { type: 'positionShow'; payload: boolean }
  | { type: 'sourceAssign'; payload: string }
  | { type: 'sourceShow'; payload: boolean }
  | { type: 'companyNameAssign'; payload: string }
  | { type: 'companyNameShow'; payload: boolean }
  | { type: 'companyStreetAssign'; payload: string }
  | { type: 'companyCityAssign'; payload: string }
  | { type: 'companyStateAssign'; payload: string }
  | { type: 'companyZipAssign'; payload: string }
  | { type: 'companyAddressShow'; payload: boolean }
type Dispatch = (action: Action) => void

type Field<T> = { value: T; show: boolean }
type Address = { street: string; city: string; state: string; zip: string }
