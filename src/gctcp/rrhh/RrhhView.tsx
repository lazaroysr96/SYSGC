import { Briefcase, FileText, Percent, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RrhhBackupData } from "../../accounting/core/types/accountingTypes";
import { CargosTab } from "./CargosTab";
import { DescuentosTab } from "./DescuentosTab";
import { DocumentosTab } from "./DocumentosTab";
import { TrabajadoresTab } from "./TrabajadoresTab";
import { EMPTY_RRHH } from "./helpers";
import type { RrhhTabProps } from "./props";

type RrhhViewProps = {
  rrhh: RrhhBackupData | null | undefined;
  nombreEmpresa: string;
  saving: boolean;
  onSave: RrhhTabProps["onSave"];
};

export function RrhhView({ rrhh, nombreEmpresa, saving, onSave }: RrhhViewProps) {
  const [tab, setTab] = useState("trabajadores");

  const datos = useMemo<RrhhBackupData>(() => {
    if (!rrhh) return EMPTY_RRHH;
    return {
      ...EMPTY_RRHH,
      ...rrhh,
      trabajadores: rrhh.trabajadores ?? [],
      cargos: rrhh.cargos ?? [],
      funcionesTrabajador: rrhh.funcionesTrabajador ?? [],
      funcionesCargo: rrhh.funcionesCargo ?? [],
      conceptosDescuento: rrhh.conceptosDescuento ?? [],
      pagosNomina: rrhh.pagosNomina ?? [],
    };
  }, [rrhh]);

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="trabajadores" className="gap-2">
          <Users className="size-4" />
          Trabajadores
        </TabsTrigger>
        <TabsTrigger value="cargos" className="gap-2">
          <Briefcase className="size-4" />
          Clasificador de Cargos
        </TabsTrigger>
        <TabsTrigger value="descuentos" className="gap-2">
          <Percent className="size-4" />
          Catálogo de Descuentos
        </TabsTrigger>
        <TabsTrigger value="documentos" className="gap-2">
          <FileText className="size-4" />
          Documentos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="trabajadores" className="mt-0">
        <TrabajadoresTab rrhh={datos} saving={saving} onSave={onSave} />
      </TabsContent>
      <TabsContent value="cargos" className="mt-0">
        <CargosTab rrhh={datos} saving={saving} onSave={onSave} />
      </TabsContent>
      <TabsContent value="descuentos" className="mt-0">
        <DescuentosTab rrhh={datos} saving={saving} onSave={onSave} />
      </TabsContent>
      <TabsContent value="documentos" className="mt-0">
        <DocumentosTab
          rrhh={datos}
          nombreEmpresa={nombreEmpresa}
          saving={saving}
          onSave={onSave}
        />
      </TabsContent>
    </Tabs>
  );
}