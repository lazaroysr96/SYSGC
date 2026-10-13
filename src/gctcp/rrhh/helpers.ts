import type {
  Cargo,
  CategoriaOcupacional,
  ConceptoDescuento,
  DescuentoAplicado,
  EstadoTrabajador,
  FormaPago,
  FuncionTrabajador,
  ModoTrabajo,
  PagoNomina,
  RrhhBackupData,
  TipoContrato,
  Trabajador,
} from "../../accounting/core/types/accountingTypes";

// ── Etiquetas de los enums (mismos labels que la app móvil) ────────────────

export const CATEGORIA_LABELS: Record<CategoriaOcupacional, string> = {
  SERVICIOS: "Trabajadores de servicios",
  ADMINISTRATIVO: "Trabajadores administrativos",
  OPERARIO: "Operarios",
  TECNICO: "Técnicos",
  CUADRO: "Cuadros",
};

/** Rango válido de grupos de escala salarial por categoría (Decreto 326, Art. 118). */
export const CATEGORIA_GRUPOS: Record<CategoriaOcupacional, { min: number; max: number }> = {
  SERVICIOS: { min: 1, max: 6 },
  ADMINISTRATIVO: { min: 3, max: 7 },
  OPERARIO: { min: 2, max: 8 },
  TECNICO: { min: 7, max: 25 },
  CUADRO: { min: 17, max: 32 },
};

export const CONTRATO_LABELS: Record<TipoContrato, string> = {
  INDEFINIDO: "Tiempo indefinido",
  DETERMINADO: "Tiempo determinado",
  EVENTUAL: "Eventual",
};

export const ESTADO_LABELS: Record<EstadoTrabajador, string> = {
  ACTIVO: "Activo",
  BAJA_TEMPORAL: "Baja temporal",
  BAJA_DEFINITIVA: "Baja definitiva",
};

export const MODOTRABAJO_LABELS: Record<ModoTrabajo, string> = {
  TASA: "Tasa mensual (190,6 h)",
  HORAS: "Por horas trabajadas",
};

export const FORMAPAGO_LABELS: Record<FormaPago, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
};

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const MESES_CORTOS = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

// ── Helper de números romanos (mismo criterio que la ficha de salario) ─────

const ROMANOS: Array<[number, string]> = [
  [1, "I"],
  [4, "IV"],
  [5, "V"],
  [9, "IX"],
  [10, "X"],
  [40, "XL"],
  [50, "L"],
  [90, "XC"],
  [100, "C"],
];

export function aRomano(n: number): string {
  let resto = Math.max(0, Math.floor(n));
  let salida = "";
  for (const [valor, simbolo] of ROMANOS) {
    while (resto >= valor) {
      salida += simbolo;
      resto -= valor;
    }
  }
  return salida;
}

// ── Utilidades de formato / ids ────────────────────────────────────────────

export function round2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function formatMoney(valor: number, moneda = "CUP"): string {
  return `${round2(valor).toLocaleString("es-CU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${moneda}`;
}

export function formatFecha(epochMillis: number | null | undefined): string {
  if (!epochMillis) return "—";
  const fecha = new Date(epochMillis);
  return `${fecha.getDate().toString().padStart(2, "0")}/${(fecha.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${fecha.getFullYear()}`;
}

export function nuevoId(prefix = ""): string {
  const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}-${id}` : id;
}

// ── Datos RRHH en blanco ───────────────────────────────────────────────────

export const EMPTY_RRHH: RrhhBackupData = {
  trabajadores: [],
  cargos: [],
  funcionesTrabajador: [],
  funcionesCargo: [],
  conceptosDescuento: [],
  pagosNomina: [],
};

// ── Derivaciones (mismas reglas que el ViewModel Android) ──────────────────

export function nombreCompleto(trabajador: Trabajador): string {
  return `${trabajador.nombre} ${trabajador.apellidos}`.trim();
}

export function cargoDe(trabajador: Trabajador, cargos: Cargo[]): Cargo | undefined {
  return cargos.find((cargo) => cargo.id === trabajador.cargoId);
}

/** Salario siempre resuelto en vivo desde el cargo; nunca se guarda en el trabajador. */
export function salarioActualDe(trabajador: Trabajador, cargos: Cargo[]): number {
  return cargoDe(trabajador, cargos)?.salarioBase ?? 0;
}

export function grupoEscalaInvalido(cargo: Cargo): boolean {
  const rango = CATEGORIA_GRUPOS[cargo.categoriaOcupacional];
  return cargo.grupoEscala < rango.min || cargo.grupoEscala > rango.max;
}

/** Sugerencia de descuentos según los conceptos activos con porcentaje. */
export function sugerirDescuentos(
  salarioBruto: number,
  conceptos: ConceptoDescuento[],
): DescuentoAplicado[] {
  return conceptos
    .filter((concepto) => concepto.activo && concepto.porcentaje != null)
    .map((concepto) => ({
      conceptoId: concepto.id,
      nombre: concepto.nombre,
      monto: round2(salarioBruto * ((concepto.porcentaje as number) / 100)),
      esManual: false,
    }));
}

export function construirPagoSugerido(
  trabajador: Trabajador,
  mes: number,
  anio: number,
  cargos: Cargo[],
  conceptos: ConceptoDescuento[],
): PagoNomina {
  const salario = salarioActualDe(trabajador, cargos);
  return {
    id: nuevoId("pago"),
    trabajadorId: trabajador.id,
    mes,
    anio,
    salarioBase: salario,
    pagosAdicionales: 0,
    descuentos: sugerirDescuentos(salario, conceptos),
    fechaPago: null,
    metodoPago: "",
    notas: "",
    diasTrabajados: 0,
    diasPeriodo: 0,
    monedaPago: null,
    montoPagado: null,
    movimientoCajaId: null,
  };
}

// ── Totales de un pago (snapshot de Nomina.PagoNomina de Android) ──────────

export function totalDescuentos(pago: PagoNomina): number {
  return round2(pago.descuentos.reduce((total, d) => total + d.monto, 0));
}

export function totalBruto(pago: PagoNomina): number {
  return round2(pago.salarioBase + pago.pagosAdicionales);
}

export function totalNeto(pago: PagoNomina): number {
  return round2(totalBruto(pago) - totalDescuentos(pago));
}

export function pagoPagado(pago: PagoNomina): boolean {
  return pago.fechaPago != null;
}

// ── Copiar funciones de la plantilla del cargo a un trabajador ─────────────

export function copiarFuncionesDeCargoATrabajador(
  rrhh: RrhhBackupData,
  trabajadorId: string,
  cargoId: string,
): FuncionTrabajador[] {
  const plantilla = rrhh.funcionesCargo.filter((funcion) => funcion.cargoId === cargoId);
  const actuales = rrhh.funcionesTrabajador.filter(
    (funcion) => funcion.trabajadorId === trabajadorId,
  );
  const yaCopiadas = new Set(
    actuales.map((funcion) => funcion.origenFuncionCargoId).filter(Boolean),
  );
  const nuevas = plantilla
    .filter((funcion) => !yaCopiadas.has(funcion.id))
    .map((funcion) => ({
      id: nuevoId("fn"),
      trabajadorId,
      descripcion: funcion.descripcion,
      orden: funcion.orden,
      asignadaPor: "",
      origenFuncionCargoId: funcion.id,
    }));
  return [...actuales, ...nuevas];
}