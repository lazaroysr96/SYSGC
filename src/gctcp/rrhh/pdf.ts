import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { TDocumentDefinitions, Content, TableCell } from "pdfmake/interfaces";
import type { PagoNomina, RrhhBackupData, Trabajador } from "../../accounting/core/types/accountingTypes";
import {
  MESES,
  aRomano,
  nombreCompleto,
  round2,
  totalBruto,
  totalDescuentos,
  totalNeto,
} from "./helpers";

void pdfMake;
void pdfFonts;

const ensureVfs = (): void => {
  const pdfMakeAny = pdfMake as unknown as { vfs?: typeof pdfFonts.vfs };
  if (!pdfMakeAny.vfs) {
    pdfMakeAny.vfs = pdfFonts.vfs;
  }
};

const COLOR_PRIMARIO = "#1e406e";
const COLOR_GRIS_CLARO = "#f0f0f0";
const COLOR_BORDE = "#c8c8c8";

const formatoCantidad = (valor: number): string => round2(valor).toFixed(2);

const nombreTrabajador = (trabajadores: Trabajador[], id: string): string => {
  const trabajador = trabajadores.find((item) => item.id === id);
  return trabajador ? nombreCompleto(trabajador) : "—";
};

const celdaEncabezado = (texto: string): TableCell => ({
  text: texto.toUpperCase(),
  fillColor: COLOR_PRIMARIO,
  color: "#ffffff",
  bold: true,
  fontSize: 7.5,
  alignment: "center",
  margin: [2, 3],
});

const celdaTexto = (texto: string, alineacion: "left" | "center" | "right" = "left"): TableCell => ({
  text: texto,
  fontSize: 8,
  alignment: alineacion,
  margin: [2, 2],
});

const celdaTotal = (
  texto: string,
  alineacion: "left" | "center" | "right" = "left",
  colSpan?: number,
): TableCell => ({
  text: texto,
  fillColor: COLOR_GRIS_CLARO,
  bold: true,
  fontSize: 8.5,
  alignment: alineacion,
  margin: [2, 3],
  ...(colSpan ? { colSpan } : {}),
});

const encabezado = (nombreEmpresa: string, titulo: string): Content[] => {
  const contenido: Content[] = [];
  if (nombreEmpresa.trim()) {
    contenido.push({
      text: nombreEmpresa,
      fontSize: 13,
      bold: true,
      alignment: "center",
      color: COLOR_PRIMARIO,
    });
  }
  contenido.push({
    text: titulo,
    fontSize: 15,
    bold: true,
    alignment: "center",
    margin: [0, 0, 0, 10],
  });
  return contenido;
};

const pieFechahora = (): Content => ({
  text: `Generado el ${new Date().toLocaleString("es-CU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`,
  fontSize: 8,
  color: "#666666",
  alignment: "center",
  margin: [0, 10, 0, 0],
});

/**
 * PreNómina mensual SC-4-05: una fila por trabajador con pago confeccionado
 * en el periodo, categoría/grupo escala (romano), horas, salario, adicionales,
 * descuentos y neto. Mismos datos que la versión Android.
 */
export function generarPrenominaPdf(
  nombreEmpresa: string,
  mes: number,
  anio: number,
  rrhh: RrhhBackupData,
): void {
  ensureVfs();

  const { trabajadores, cargos } = rrhh;
  const pagos = rrhh.pagosNomina.filter((pago) => pago.mes === mes && pago.anio === anio);

  const cuerpo: TableCell[][] = [];
  let totalSalarioBase = 0;
  let totalAdicionales = 0;
  let totalDescuentosTodos = 0;
  let totalNetoTodos = 0;

  pagos
    .slice()
    .sort((a, b) =>
      nombreTrabajador(trabajadores, a.trabajadorId).localeCompare(
        nombreTrabajador(trabajadores, b.trabajadorId),
      ),
    )
    .forEach((pago) => {
      const trabajador = trabajadores.find((t) => t.id === pago.trabajadorId);
      const cargo = cargos.find((c) => c.id === trabajador?.cargoId);

      cuerpo.push([
        celdaTexto(trabajador?.carnetIdentidad || "—"),
        celdaTexto(trabajador ? nombreCompleto(trabajador) : "—"),
        celdaTexto(cargo?.nombre || "—"),
        celdaTexto(cargo ? aRomano(cargo.grupoEscala) : "—", "center"),
        celdaTexto(
          cargo?.categoriaOcupacional.charAt(0) || "—",
          "center",
        ),
        celdaTexto(formatoCantidad(190.6), "right"),
        celdaTexto(formatoCantidad(pago.salarioBase), "right"),
        celdaTexto(formatoCantidad(pago.pagosAdicionales), "right"),
        celdaTexto(formatoCantidad(totalDescuentos(pago)), "right"),
        celdaTexto(formatoCantidad(totalNeto(pago)), "right"),
      ]);

      totalSalarioBase += pago.salarioBase;
      totalAdicionales += pago.pagosAdicionales;
      totalDescuentosTodos += totalDescuentos(pago);
      totalNetoTodos += totalNeto(pago);
    });

  cuerpo.push([
    celdaTotal("TOTAL", "left", 6),
    celdaTotal(formatoCantidad(totalSalarioBase), "right"),
    celdaTotal(formatoCantidad(totalAdicionales), "right"),
    celdaTotal(formatoCantidad(totalDescuentosTodos), "right"),
    celdaTotal(formatoCantidad(totalNetoTodos), "right"),
  ]);

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [24, 24, 24, 24],
    content: [
      ...encabezado(nombreEmpresa, `Prenómina de salarios — ${MESES[mes - 1]} ${anio}`),
      {
        table: {
          widths: [60, 100, 90, 22, 18, 35, 60, 60, 60, 60],
          body: [
            [
              celdaEncabezado("CI"),
              celdaEncabezado("Trabajador"),
              celdaEncabezado("Cargo"),
              celdaEncabezado("GE"),
              celdaEncabezado("CO"),
              celdaEncabezado("Horas"),
              celdaEncabezado("Salario base"),
              celdaEncabezado("Adicionales"),
              celdaEncabezado("Descuentos"),
              celdaEncabezado("Neto"),
            ],
            ...cuerpo,
          ],
        },
        layout: {
          hLineColor: () => COLOR_BORDE,
          vLineColor: () => COLOR_BORDE,
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
        },
      },
      pieFechahora(),
    ],
  };

  pdfMake.createPdf(docDefinition).download(`prenomina_${anio}_${mes}.pdf`);
}

/**
 * Nómina mensual completa: salario, adicionales, descuentos, neto y estado.
 */
export function generarNominaPdf(
  nombreEmpresa: string,
  mes: number,
  anio: number,
  rrhh: RrhhBackupData,
): void {
  ensureVfs();

  const { trabajadores, cargos } = rrhh;
  const pagos = rrhh.pagosNomina.filter((pago) => pago.mes === mes && pago.anio === anio);

  const cuerpo: TableCell[][] = [];
  let totalBrutoTodos = 0;
  let totalDescuentosTodos = 0;
  let totalNetoTodos = 0;

  pagos
    .slice()
    .sort((a, b) =>
      nombreTrabajador(trabajadores, a.trabajadorId).localeCompare(
        nombreTrabajador(trabajadores, b.trabajadorId),
      ),
    )
    .forEach((pago) => {
      const trabajador = trabajadores.find((t) => t.id === pago.trabajadorId);
      const cargo = cargos.find((c) => c.id === trabajador?.cargoId);

      cuerpo.push([
        celdaTexto(trabajador ? nombreCompleto(trabajador) : "—"),
        celdaTexto(cargo?.nombre || "—"),
        celdaTexto(formatoCantidad(pago.salarioBase), "right"),
        celdaTexto(formatoCantidad(pago.pagosAdicionales), "right"),
        celdaTexto(formatoCantidad(totalDescuentos(pago)), "right"),
        celdaTexto(formatoCantidad(totalNeto(pago)), "right"),
        celdaTexto(pago.fechaPago ? "Pagado" : "Pendiente", "center"),
      ]);

      totalBrutoTodos += totalBruto(pago);
      totalDescuentosTodos += totalDescuentos(pago);
      totalNetoTodos += totalNeto(pago);
    });

  cuerpo.push([
    celdaTotal("TOTAL", "left", 2),
    celdaTotal(formatoCantidad(totalBrutoTodos), "right"),
    celdaTotal("", "right"),
    celdaTotal(formatoCantidad(totalDescuentosTodos), "right"),
    celdaTotal(formatoCantidad(totalNetoTodos), "right"),
    celdaTotal("", "center"),
  ]);

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [24, 24, 24, 24],
    content: [
      ...encabezado(nombreEmpresa, `Nómina de salarios — ${MESES[mes - 1]} ${anio}`),
      {
        table: {
          widths: [120, 90, 60, 60, 60, 60, 60],
          body: [
            [
              celdaEncabezado("Trabajador"),
              celdaEncabezado("Cargo"),
              celdaEncabezado("Salario base"),
              celdaEncabezado("Adicionales"),
              celdaEncabezado("Descuentos"),
              celdaEncabezado("Neto"),
              celdaEncabezado("Estado"),
            ],
            ...cuerpo,
          ],
        },
        layout: {
          hLineColor: () => COLOR_BORDE,
          vLineColor: () => COLOR_BORDE,
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
        },
      },
      pieFechahora(),
    ],
  };

  pdfMake.createPdf(docDefinition).download(`nomina_${anio}_${mes}.pdf`);
}

type PeriodoMes = { mes: number; anio: number };

/**
 * Resumen de gastos de salario por periodo (mes/año agrupados y ordenados).
 */
export function generarResumenGastosPdf(
  nombreEmpresa: string,
  rrhh: RrhhBackupData,
): void {
  ensureVfs();

  const pagosPorMes = new Map<string, PagoNomina[]>();
  rrhh.pagosNomina.forEach((pago) => {
    const clave = `${pago.anio}-${pago.mes}`;
    pagosPorMes.set(clave, [...(pagosPorMes.get(clave) ?? []), pago]);
  });

  const periodos: PeriodoMes[] = Array.from(pagosPorMes.keys())
    .map((clave) => {
      const [anio, mes] = clave.split("-").map(Number);
      return { anio, mes };
    })
    .sort((a, b) => a.anio - b.anio || a.mes - b.mes);

  const cuerpo: TableCell[][] = [];
  let granTotalBruto = 0;
  let granTotalDescuentos = 0;
  let granTotalNeto = 0;

  periodos.forEach(({ mes, anio }) => {
    const pagos = pagosPorMes.get(`${anio}-${mes}`) ?? [];
    const bruto = pagos.reduce((acc, p) => acc + totalBruto(p), 0);
    const descuentos = pagos.reduce((acc, p) => acc + totalDescuentos(p), 0);
    const neto = pagos.reduce((acc, p) => acc + totalNeto(p), 0);

    cuerpo.push([
      celdaTexto(`${MESES[mes - 1]} ${anio}`),
      celdaTexto(formatoCantidad(bruto), "right"),
      celdaTexto(formatoCantidad(descuentos), "right"),
      celdaTexto(formatoCantidad(neto), "right"),
      celdaTexto(String(pagos.length), "center"),
    ]);

    granTotalBruto += bruto;
    granTotalDescuentos += descuentos;
    granTotalNeto += neto;
  });

  cuerpo.push([
    celdaTotal("TOTAL DEL PERIODO"),
    celdaTotal(formatoCantidad(granTotalBruto), "right"),
    celdaTotal(formatoCantidad(granTotalDescuentos), "right"),
    celdaTotal(formatoCantidad(granTotalNeto), "right"),
    celdaTotal("", "center"),
  ]);

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [28, 28, 28, 28],
    content: [
      ...encabezado(nombreEmpresa, "Resumen de gastos de salario"),
      {
        table: {
          widths: [110, 80, 80, 80, 60],
          body: [
            [
              celdaEncabezado("Periodo"),
              celdaEncabezado("Bruto"),
              celdaEncabezado("Descuentos"),
              celdaEncabezado("Neto pagado"),
              celdaEncabezado("Trabajadores"),
            ],
            ...cuerpo,
          ],
        },
        layout: {
          hLineColor: () => COLOR_BORDE,
          vLineColor: () => COLOR_BORDE,
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
        },
      },
      pieFechahora(),
    ],
  };

  pdfMake
    .createPdf(docDefinition)
    .download(`resumen_gastos_salario_${Date.now()}.pdf`);
}