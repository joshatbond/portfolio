'use client'

import { type ReactNode, isValidElement, useRef } from 'react'

import { FormProvider, useForm } from './FormContext'

export default function CoverLetterGenerator() {
  return (
    <FormProvider>
      <div>
        <div className="flex gap-4 px-4 pt-4 [--output-height:85vh]">
          <Form />
          <Output />
        </div>
      </div>
    </FormProvider>
  )
}

function Form() {
  const { state, dispatch } = useForm()

  return (
    <form className="h-[var(--output-height)] flex-1 space-y-4 overflow-hidden overscroll-contain rounded bg-neutral-100 p-4 pr-1 shadow">
      <div className="flex h-[calc(var(--output-height)-2rem)] flex-col gap-12 overflow-auto overscroll-contain pr-4">
        <section>
          <h2 className="text-xl font-semibold">My Info</h2>
          {/* name */}
          <TextInput
            id="name"
            label="Name"
            name="name"
            value={state.name.value}
            update={payload => dispatch({ type: 'nameAssign', payload })}
            checkbox={
              <Checkbox
                id="use-name"
                checked={state.name.show}
                update={payload =>
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
            id="email"
            label="Email"
            name="email"
            value={state.email.value}
            update={payload => dispatch({ type: 'emailAssign', payload })}
            checkbox={
              <Checkbox
                id="use-email"
                checked={state.email.show}
                update={payload =>
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
            id="phone"
            label="Phone"
            name="phone"
            value={state.phone.value}
            update={payload => dispatch({ type: 'phoneAssign', payload })}
            checkbox={
              <Checkbox
                id="use-phone"
                checked={state.phone.show}
                update={payload =>
                  dispatch({
                    type: 'phoneShow',
                    payload,
                  })
                }
              />
            }
          />
          {/* address */}
          <div className="flex items-center gap-4 pt-4">
            <h3 className="text-lg">Address</h3>
            <Checkbox
              id="use-address"
              checked={state.address.show}
              update={payload =>
                dispatch({
                  type: 'addressShow',
                  payload,
                })
              }
            />
          </div>
          <div className="space-y-2 pl-6">
            <TextInput
              id="street"
              label="Street"
              name="street"
              value={state.address.value.street}
              update={payload => dispatch({ type: 'streetAssign', payload })}
            />
            <TextInput
              id="city"
              label="City"
              name="city"
              value={state.address.value.city}
              update={payload => dispatch({ type: 'cityAssign', payload })}
            />
            <TextInput
              id="state"
              label="State"
              name="state"
              value={state.address.value.state}
              update={payload => dispatch({ type: 'stateAssign', payload })}
            />
            <TextInput
              id="zip"
              label="Zip"
              name="zip"
              value={state.address.value.zip}
              update={payload => dispatch({ type: 'zipAssign', payload })}
            />
          </div>
        </section>
        <section>
          <h2 className="pb-2 text-xl font-semibold">Company Info</h2>
          <TextInput
            id="position"
            label="Position"
            name="position"
            value={state.position.value}
            update={payload => dispatch({ type: 'positionAssign', payload })}
            autoFocus={true}
          />
          <TextInput
            id="source"
            label="Source"
            name="source"
            value={state.source.value}
            update={payload => dispatch({ type: 'sourceAssign', payload })}
            checkbox={
              <Checkbox
                id="use-source"
                checked={state.source.show}
                update={payload =>
                  dispatch({
                    type: 'sourceShow',
                    payload,
                  })
                }
              />
            }
          />
          <TextInput
            id="company-name"
            label="Company"
            name="company-name"
            value={state.companyName.value}
            update={payload => dispatch({ type: 'companyNameAssign', payload })}
            checkbox={
              <Checkbox
                id="use-company-name"
                checked={state.companyName.show}
                update={payload =>
                  dispatch({
                    type: 'companyNameShow',
                    payload,
                  })
                }
              />
            }
          />
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
    <div className="flex gap-2">
      <label htmlFor={id}>Use?</label>

      <input
        type="checkbox"
        className="p-2 outline-offset-4"
        id={id}
        checked={checked}
        onChange={e => update(e.target.checked)}
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
      <label className="flex items-end gap-4" htmlFor={id}>
        <span className="min-w-[3rem]">{label}</span>

        <input
          type="text"
          className="min-w-[20rem] rounded-t-md border-b-2 border-b-black bg-transparent p-2 pb-1 outline-none hover:border-b-blue-500 hover:bg-neutral-50 focus:border-b-blue-500 focus:bg-neutral-50"
          id={id}
          name={name}
          value={value}
          onChange={e => update(e.target.value)}
          autoFocus={autoFocus}
        />
      </label>

      {checkbox}
    </fieldset>
  )
}

function Output() {
  const { state } = useForm()
  const contentRef = useRef<HTMLDivElement>(null)

  const onClick = () => {
    const text = parse(contentRef.current?.innerHTML)
    const blob = new Blob([text], { type: 'text/plain' })
    const hiddenElement = document.createElement('a')
    hiddenElement.href = URL.createObjectURL(blob)
    hiddenElement.download = 'cover-letter.txt'
    hiddenElement.click()
  }
  const parse = (s?: string) => {
    if (!s) return ''
    return s
      .replace(/\<div\>|\<\/div\>/g, '')
      .replace(/\<\/p\>\<p\>/g, '\n\n')
      .replace(/(\<p\>|\<\/p\>|\<span\>|\<\/span\>)/g, '')
  }

  return (
    <div className="flex h-[var(--output-height)] flex-1 flex-col gap-4 overflow-hidden overscroll-contain rounded bg-neutral-100 p-4 pr-1 shadow">
      <div
        ref={contentRef}
        className="max-h-[calc(var(--output-height)-4rem)] flex-1 space-y-4 overflow-auto overscroll-contain"
      >
        <p>
          Dear <Field placeholder="Company" value={state.companyName.value} />{' '}
          Talent Acquisition team,
        </p>
        <p>
          I am reaching out to express my interest in the{' '}
          <Field placeholder="Software Engineer" value={state.position.value} />{' '}
          position
          {state.source.show ? (
            <>
              {' '}
              recently advertised on{' '}
              <Field
                placeholder="Job Site/Career site"
                value={state.source.value}
              />
            </>
          ) : null}
          .
        </p>

        <p>
          After thoroughly analyzing the job description, I recognized three
          primary requirements essential for success in this role: expertise in
          modern JavaScript frameworks, proficiency in building scalable
          cloud-based architectures, and a strong track record in managing full
          lifecycle software development projects. My background and skills
          align well with these expectations.
        </p>

        <p>
          My technical proficiency in JavaScript, TypeScript, and frameworks
          like Node.js, React, and Vue, supplemented by my hands-on experience
          with cloud services like Docker and databases such as PostgreSQL and
          MongoDB, enable me to construct and scale effective software solutions
          efficiently. At Bond, I led the development of high-traffic web
          applications for the entertainment sector, which not only met but
          exceeded performance benchmarks through strategic use of these
          technologies.
        </p>

        <p>
          Furthermore, I have a solid foundation in designing and deploying
          robust cloud-based architectures, essential for ensuring high
          availability and resilience of system infrastructures. For example, at
          American Express, I architected the transition of a GraphQL repository
          to a federated model, enhancing system flexibility and performance,
          demonstrating my capability to innovate and improve existing systems.
        </p>

        <p>
          Lastly, my role at Linear Systems Inc involved overseeing projects
          from conception through to deployment, emphasizing the importance of
          meticulous project management. This experience sharpened my ability to
          manage project timelines and deliverables effectively, ensuring all
          phases of the software development lifecycle are executed to the
          highest standard, which I am eager to leverage at{' '}
          <Field placeholder="Company" value={state.companyName.value} />.
        </p>

        <p>
          I would be delighted to be granted an opportunity for an interview,
          during which I can tell you more about my skills and experience, and
          prove to you that I am the right fit for this role. I hope that you
          will give me a chance to contribute to your mission and growth going
          forward. I look forward to hearing from you.
        </p>

        <div>
          <p>Yours sincerely,</p>
          <p>{state.name.value}</p>
          <p>{state.email.value}</p>
          {state.phone.show ? <p>{state.phone.value}</p> : null}
        </div>
      </div>

      <div className="mr-3 flex">
        <button
          onClick={onClick}
          className="flex-1 rounded-md bg-blue-700 px-4 py-1 text-white outline-none focus-within:bg-blue-500 hover:bg-blue-500 active:bg-blue-500"
        >
          Download
        </button>
      </div>
    </div>
  )
}

function Content() {
  const { state } = useForm()
  return (
    <div className="max-h-[calc(var(--output-height)-4rem)] flex-1 space-y-4 overflow-auto overscroll-contain">
      <p>
        Dear <Field placeholder="Company" value={state.companyName.value} />{' '}
        Talent Acquisition team,
      </p>
      <p>
        I am reaching out to express my interest in the{' '}
        <Field placeholder="Software Engineer" value={state.position.value} />{' '}
        position
        {state.source.show ? (
          <>
            {' '}
            recently advertised on{' '}
            <Field
              placeholder="Job Site/Career site"
              value={state.source.value}
            />
          </>
        ) : null}
        .
      </p>

      <p>
        After thoroughly analyzing the job description, I recognized three
        primary requirements essential for success in this role: expertise in
        modern JavaScript frameworks, proficiency in building scalable
        cloud-based architectures, and a strong track record in managing full
        lifecycle software development projects. My background and skills align
        well with these expectations.
      </p>

      <p>
        My technical proficiency in JavaScript, TypeScript, and frameworks like
        Node.js, React, and Vue, supplemented by my hands-on experience with
        cloud services like Docker and databases such as PostgreSQL and MongoDB,
        enable me to construct and scale effective software solutions
        efficiently. At Bond, I led the development of high-traffic web
        applications for the entertainment sector, which not only met but
        exceeded performance benchmarks through strategic use of these
        technologies.
      </p>

      <p>
        Furthermore, I have a solid foundation in designing and deploying robust
        cloud-based architectures, essential for ensuring high availability and
        resilience of system infrastructures. For example, at American Express,
        I architected the transition of a GraphQL repository to a federated
        model, enhancing system flexibility and performance, demonstrating my
        capability to innovate and improve existing systems.
      </p>

      <p>
        Lastly, my role at Linear Systems Inc involved overseeing projects from
        conception through to deployment, emphasizing the importance of
        meticulous project management. This experience sharpened my ability to
        manage project timelines and deliverables effectively, ensuring all
        phases of the software development lifecycle are executed to the highest
        standard, which I am eager to leverage at{' '}
        <Field placeholder="Company" value={state.companyName.value} />.
      </p>

      <p>
        I would be delighted to be granted an opportunity for an interview,
        during which I can tell you more about my skills and experience, and
        prove to you that I am the right fit for this role. I hope that you will
        give me a chance to contribute to your mission and growth going forward.
        I look forward to hearing from you.
      </p>

      <div>
        <p>Yours sincerely,</p>
        <p>{state.name.value}</p>
        <p>{state.email.value}</p>
        {state.phone.show ? <p>{state.phone.value}</p> : null}
      </div>
    </div>
  )
}

function Field({ placeholder, value }: { placeholder: string; value: string }) {
  return value ? (
    <span>{value}</span>
  ) : (
    <span className="font-semibold text-red-500">[{placeholder}]</span>
  )
}
