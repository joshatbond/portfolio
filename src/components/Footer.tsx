import Link from 'next/link'

export default function Footer({
  addAttribution = true,
}: {
  addAttribution?: boolean
}) {
  return (
    <footer className='flex justify-between bg-white/5 p-4 print:hidden'>
      <span className={addAttribution ? '' : 'w-full text-center'}>
        Copyright &copy; 2023 Joshua Richardson
      </span>

      {addAttribution && (
        <div>
          <Link href='https://www.freepik.com/free-vector/ui-ux-designers-isometric-composition-with-small-people-creating-custom-design-web-site-3d-vector-illustration_26760925.htm#query=web%20development&position=3&from_view=keyword&track=ais&uuid=f4fd44c5-527f-4dcf-a6a5-23bcb38c0a10'>
            <span className='hover:text-blue-400 hover:underline'>
              Image by macrovector
            </span>
          </Link>
          <span>&nbsp;on Freepik</span>
        </div>
      )}
    </footer>
  )
}
