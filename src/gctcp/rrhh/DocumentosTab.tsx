import { FileDown, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MESES_CORTOS, formatMoney, totalNeto } from "./helpers";
import { generarNominaPdf, generarPrenominaPdf, generarResumenGastosPdf } from "./pdf";
import type { RrhhTabProps } from "./props";

type DocumentosTabProps = RrhhTabProps & {
  nombreEmpresa: string;
};

const ultimosPeriodos = (count = 24): Array<{ mes: number; anio: number }> => {
  const ahora = new Date();
  return Array.from({ length: count }, (_, offset) => {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - offset, 1);
    return { mes: fecha.getMonth() + 1, anio: fecha.getFullYear() };
  });
};

const periodoClave = (mes: number, anio: number): string => `${anio}-${mes}`;

export function DocumentosTab({
  rrhh,
  saving,
  nombreEmpresa,
}: DocumentosTabProps) {
  const [periodos] = useState(() =>
    ultimosPeriodos().map(({ mes, anio }) => periodoClave(mes, anio)),
  );
  const ahora = new Date();
  const [periodo, setPeriodo] = useState(
    periodoClave(ahora.getMonth() + 1, ahora.getFullYear()),
  );
  const [generando, setGenerando] = useState<string | null>(null);

  const [anioStr, mesStr] = periodo.split("-");
  const mes = Number(mesStr);
  const anio = Number(anioStr);

  useEffect(() => {
    if (!periodos.includes(periodo)) {
      setPeriodo(periodos[0] ?? periodo);
    }
  }, [periodos, periodo]);

  const pagosPeriodo = useMemo(
    () =>
      rrhh.pagosNomina.filter((p) => p.mes === mes && p.anio === anio),
    [rrhh.pagosNomina, mes, anio],
  );

  const netoPeriodo = pagosPeriodo.reduce((acc, p) => acc + totalNeto(p), 0);

  const descargar = async (tipo: string, generar: () => void) => {
    setGenerando(tipo);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      generar();
    } finally {
      setGenerando(null);
    }
  };

  const sinPagos = pagosPeriodo.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">
          Documentos ({MESES_CORTOS[mes - 1]} {anio})
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Genera los documentos de pago del periodo seleccionado.
        </p>
      </div>

      <Card className="grid gap-4 p-4 sm:grid-cols-[10rem_1fr]">
        <div className="grid gap-2">
          <Label>Periodo</Label>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodos.map((clave) => {
                const [a, m] = clave.split("-").map(Number);
                return (
                  <SelectItem key={clave} value={clave}>
                    {MESES_CORTOS[m - 1]} {a}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Documentos que incluyen este periodo:
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {pagosPeriodo.length} pago(s) · {formatMoney(netoPeriodo)}
            </span>
            {sinPagos && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Sin pagos confeccionados en este periodo.
              </span>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <DocumentoCard
          titulo="Prenómina SC-4-05"
          descripcion="Planilla oficial de prenómina. Incluye la columna ID, la categoría y el grupo de escala, adiciones y retenciones de cada trabajador."
          icona={<FileText className="size-5" />}
          cargando={generando === "prenomina"}
          deshabilitado={saving}
          onDescargar={() =>
            descargar("prenomina", () =>
              generarPrenominaPdf(nombreEmpresa, mes, anio, rrhh),
            )
          }
        />
        <DocumentoCard
          titulo="Nómina"
          descripcion="Resumen de Nómina por periodo con el neto a pagar de cada trabajador."
          icona={<FileSpreadsheet className="size-5" />}
          cargando={generando === "nomina"}
          deshabilitado={saving}
          onDescargar={() =>
            descargar("nomina", () => generarNominaPdf(nombreEmpresa, mes, anio, rrhh))
          }
        />
        <DocumentoCard
          titulo="Resumen de gastos de salario"
          descripcion="Gasto total por concepto de salario acumulado por periodo, para el control contable."
          icona={<FileDown className="size-5" />}
          cargando={generando === "resumen"}
          deshabilitado={saving}
          onDescargar={() =>
            descargar("resumen", () => generarResumenGastosPdf(nombreEmpresa, rrhh))
          }
        />
      </div>
    </div>
  );
}

function DocumentoCard({
  titulo,
  descripcion,
  icona,
  cargando,
  deshabilitado,
  onDescargar,
}: {
  titulo: string;
  descripcion: string;
  icona: ReactNode;
  cargando: boolean;
  deshabilitado: boolean;
  onDescargar: () => void;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {icona}
        </div>
        <p className="font-semibold text-slate-950 dark:text-slate-50">{titulo}</p>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{descripcion}</p>
      <Button
        size="sm"
        className="mt-auto"
        onClick={onDescargar}
        disabled={deshabilitado || cargando}
      >
        {cargando ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <FileDown className="size-4" />
        )}
        {cargando ? "Generando..." : "Descargar PDF"}
      </Button>
    </Card>
  );
}