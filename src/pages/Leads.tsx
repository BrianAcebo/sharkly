import { useEffect } from "react";
import PageMeta from "../components/common/PageMeta";
import { useBreadcrumbs } from "../hooks/useBreadcrumbs";
import Leads from "../components/leads/Leads";

export default function LeadsPage() {
  const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Leads');
	}, [setTitle]);

  return (
    <>
      <PageMeta title="Leads" description="Manage your leads and prospects" />
      <Leads />
    </>
  );
}