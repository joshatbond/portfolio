'use client'

import { type ReactNode } from 'react'
import { FormProvider, useForm } from './FormContext'

export default function CoverLetterGenerator() {
  return (
    <FormProvider>
      <div className='flex p-4 gap-4 [--output-height:85vh]'>
        <Form />
        <Output />
      </div>
    </FormProvider>
  )
}

function Form() {
  const { state, dispatch } = useForm()

  return (
    <form className='flex-1 space-y-4 overflow-hidden h-[var(--output-height)] overscroll-contain bg-neutral-100 p-4 pr-1 rounded shadow'>
      <div className='flex flex-col gap-12 overflow-auto pr-4 overscroll-contain h-[calc(var(--output-height)-2rem)]'>
        <section>
          <h2 className='text-xl font-semibold'>My Info</h2>
          {/* name */}
          <TextInput
            id='name'
            label='Name'
            name='name'
            value={state.name.value}
            update={(payload) => dispatch({ type: 'nameAssign', payload })}
            checkbox={
              <Checkbox
                id='use-name'
                checked={state.name.show}
                update={(payload) =>
                  dispatch({
                    type: 'nameShow',
                    payload,
                  })
                }
              />
            }
          />
          {/* email */}
          <TextInput
            id='email'
            label='Email'
            name='email'
            value={state.email.value}
            update={(payload) => dispatch({ type: 'emailAssign', payload })}
            checkbox={
              <Checkbox
                id='use-email'
                checked={state.email.show}
                update={(payload) =>
                  dispatch({
                    type: 'emailShow',
                    payload,
                  })
                }
              />
            }
          />
          {/* phone */}
          <TextInput
            id='phone'
            label='Phone'
            name='phone'
            value={state.phone.value}
            update={(payload) => dispatch({ type: 'phoneAssign', payload })}
            checkbox={
              <Checkbox
                id='use-phone'
                checked={state.phone.show}
                update={(payload) =>
                  dispatch({
                    type: 'phoneShow',
                    payload,
                  })
                }
              />
            }
          />
          {/* address */}
          <div className='flex gap-4 pt-4 items-center'>
            <h3 className='text-lg'>Address</h3>
            <Checkbox
              id='use-address'
              checked={state.address.show}
              update={(payload) =>
                dispatch({
                  type: 'addressShow',
                  payload,
                })
              }
            />
          </div>
          <div className='pl-6 space-y-2'>
            <TextInput
              id='street'
              label='Street'
              name='street'
              value={state.address.value.street}
              update={(payload) => dispatch({ type: 'streetAssign', payload })}
            />
            <TextInput
              id='city'
              label='City'
              name='city'
              value={state.address.value.city}
              update={(payload) => dispatch({ type: 'cityAssign', payload })}
            />
            <TextInput
              id='state'
              label='State'
              name='state'
              value={state.address.value.state}
              update={(payload) => dispatch({ type: 'stateAssign', payload })}
            />
            <TextInput
              id='zip'
              label='Zip'
              name='zip'
              value={state.address.value.zip}
              update={(payload) => dispatch({ type: 'zipAssign', payload })}
            />
          </div>
        </section>
        <section>
          <h2 className='text-xl font-semibold pb-2'>Company Info</h2>
          <TextInput
            id='position'
            label='Position'
            name='position'
            value={state.position.value}
            update={(payload) => dispatch({ type: 'positionAssign', payload })}
            autoFocus={true}
          />
          <TextInput
            id='source'
            label='Source'
            name='source'
            value={state.source.value}
            update={(payload) => dispatch({ type: 'sourceAssign', payload })}
            checkbox={
              <Checkbox
                id='use-source'
                checked={state.source.show}
                update={(payload) =>
                  dispatch({
                    type: 'sourceShow',
                    payload,
                  })
                }
              />
            }
          />
          <TextInput
            id='company-name'
            label='Company'
            name='company-name'
            value={state.companyName.value}
            update={(payload) =>
              dispatch({ type: 'companyNameAssign', payload })
            }
            checkbox={
              <Checkbox
                id='use-company-name'
                checked={state.companyName.show}
                update={(payload) =>
                  dispatch({
                    type: 'companyNameShow',
                    payload,
                  })
                }
              />
            }
          />
          {/* address */}
          <div className='flex gap-4 pt-4 items-center'>
            <h3 className='text-lg'>Address</h3>
            <Checkbox
              id='use-company-address'
              checked={state.companyAddress.show}
              update={(payload) =>
                dispatch({
                  type: 'companyAddressShow',
                  payload,
                })
              }
            />
          </div>
          <div className='pl-6 space-y-2'>
            <TextInput
              id='company-street'
              label='Street'
              name='company-street'
              value={state.companyAddress.value.street}
              update={(payload) =>
                dispatch({ type: 'companyStreetAssign', payload })
              }
            />
            <TextInput
              id='company-city'
              label='City'
              name='company-city'
              value={state.companyAddress.value.city}
              update={(payload) =>
                dispatch({ type: 'companyCityAssign', payload })
              }
            />
            <TextInput
              id='company-state'
              label='State'
              name='company-state'
              value={state.companyAddress.value.state}
              update={(payload) =>
                dispatch({ type: 'companyStateAssign', payload })
              }
            />
            <TextInput
              id='company-zip'
              label='Zip'
              name='company-zip'
              value={state.companyAddress.value.zip}
              update={(payload) =>
                dispatch({ type: 'companyZipAssign', payload })
              }
            />
          </div>
        </section>
      </div>
    </form>
  )
}
function Checkbox({
  checked,
  id,
  update,
}: Partial<HTMLInputElement> & { update: (b: boolean) => void }) {
  return (
    <div className='flex gap-2'>
      <label htmlFor={id}>Use?</label>

      <input
        type='checkbox'
        className='p-2 outline-offset-4'
        id={id}
        checked={checked}
        onChange={(e) => update(e.target.checked)}
      />
    </div>
  )
}
function TextInput({
  autoFocus,
  checkbox,
  id,
  label,
  name,
  value,
  update,
}: Partial<HTMLInputElement> & {
  checkbox?: ReactNode
  label: string
  update: (s: string) => void
  autoFocus?: boolean
}) {
  return (
    <fieldset
      className={`flex gap-4 ${checkbox ? 'justify-between' : 'justify-start'} items-end`}
    >
      <label className='flex gap-4 items-end' htmlFor={id}>
        <span className='min-w-[3rem]'>{label}</span>

        <input
          type='text'
          className='min-w-[20rem] outline-none p-2 pb-1 rounded-t-md bg-transparent hover:bg-neutral-50 focus:bg-neutral-50 border-b-2 border-b-black hover:border-b-blue-500 focus:border-b-blue-500'
          id={id}
          name={name}
          value={value}
          onChange={(e) => update(e.target.value)}
          autoFocus={autoFocus}
        />
      </label>

      {checkbox}
    </fieldset>
  )
}

function Output() {
  const { state } = useForm()

  return (
    <div className='flex-1 space-y-4 overflow-hidden h-[var(--output-height)] overscroll-contain bg-neutral-100 p-4 pr-1 rounded shadow'>
      <div className='space-y-4 h-[calc(var(--output-height)-2rem)] overflow-auto overscroll-contain'>
        <div>
          {state.name.show ? <p>{state.name.value}</p> : null}
          {state.address.show ? (
            <div>
              <p>{state.address.value.street}</p>
              <p>
                {state.address.value.city}, {state.address.value.state}{' '}
                {state.address.value.zip}
              </p>
            </div>
          ) : null}
          {state.email.show ? <p>{state.email.value}</p> : null}
          {state.phone.show ? <p>{state.phone.value}</p> : null}
          {new Intl.DateTimeFormat('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }).format(new Date())}
        </div>

        <div>
          {state.companyName.show ? <p>{state.companyName.value}</p> : null}
          {state.companyAddress.show ? (
            <div>
              <p>{state.companyAddress.value.street}</p>
              <p>
                {state.companyAddress.value.city},{' '}
                {state.companyAddress.value.state}{' '}
                {state.companyAddress.value.zip}
              </p>
            </div>
          ) : null}
        </div>

        <p>
          I am writing to express my interest in the{' '}
          <Field placeholder='position' value={state.position.value} /> position
          at{' '}
          <Field placeholder='Company Name' value={state.companyName.value} />,
          as advertised on{' '}
          <Field
            placeholder='where you found the job posting'
            value={state.source.value}
          />
          . With a solid background in both front-end and back-end development,
          combined with a passion for creating innovative web solutions, I am
          confident in my ability to contribute effectively to your team.
        </p>

        <p>
          <Field
            placeholder='In my previous role at [Previous Company], I was responsible for
          developing and maintaining several web applications from conception to
          deployment. I have experience with a variety of programming languages
          and frameworks including HTML, CSS, JavaScript, React.js, Node.js, and
          MongoDB, allowing me to create dynamic and responsive web experiences.
          My proficiency in both client-side and server-side development enables
          me to tackle complex challenges and deliver high-quality solutions
          within tight deadlines.'
            value=''
          />
        </p>

        <p>
          <Field
            placeholder='One project I am particularly proud of is [mention a specific project
          or achievement that demonstrates your skills and experience]. By
          leveraging my expertise in full-stack development, I was able to
          enhance the user experience, optimize performance, and improve overall
          efficiency, resulting in [specific positive outcome or impact].'
            value=''
          />
        </p>

        <p>
          I am also adept at collaborating with cross-functional teams,
          communicating technical concepts to non-technical stakeholders, and
          staying updated on emerging technologies and best practices in web
          development. I am excited about the opportunity to bring my unique
          blend of technical skills, creativity, and problem-solving abilities
          to{' '}
          <Field placeholder='Company Name' value={state.companyName.value} />.
        </p>

        <p>
          I am highly motivated to join a dynamic team where I can continue to
          grow both personally and professionally while making meaningful
          contributions to exciting projects. Thank you for considering my
          application. I look forward to the possibility of discussing how my
          skills and experiences align with the needs of your team.
        </p>

        <div>
          <p>Sincerely,</p>
          <p>{state.name.value}</p>
        </div>
      </div>
    </div>
  )
}

function Field({ placeholder, value }: { placeholder: string; value: string }) {
  return value ? (
    <span>{value}</span>
  ) : (
    <span className='text-red-500 font-semibold'>[{placeholder}]</span>
  )
}
