import OfficialsDirectory, { getOfficialsPageProps, senatorOfficialTitles } from "./dail"

export async function getServerSideProps(context) {
  return getOfficialsPageProps(context, senatorOfficialTitles)
}

export default function SenatorsPage(props) {
  return <OfficialsDirectory {...props} directory="senators" />
}
