import { Edit, Percent, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ConceptoDescuento } from "../../accounting/core/types/accountingTypes";
import { formatMoney, nuevoId } from "./helpers";
import type { RrhhTabProps } from "./props";

export function DescuentosTab({ rrhh, saving, onSave }: RrhhTabProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editando, setEditando] = useState<ConceptoDescuento | null>(null);
  const [aEliminar, setAEliminar] = useState<ConceptoDescuento | null>(null);

  const conceptosOrdenados = [...rrhh.conceptosDescuento].sort(
    (a, b) =>
      Number(b.activo) - Number(a.activo) ||
      a.nombre.localeCompare(b.nombre),
  );

  const guardar = (concepto: ConceptoDescuento) => {
    const existe = rrhh.conceptosDescuento.some((c) => c.id === concepto.id);
    onSave(
      {
        ...rrhh,
        conceptosDescuento: existe
          ? rrhh.conceptosDescuento.map((c) => (c.id === concepto.id ? concepto : c))
          : [...rrhh.conceptosDescuento, concepto],
      },
      {
        title: "Concepto guardado",
        description: concepto.nombre,
      },
    );
  };

  const eliminar = (concepto: ConceptoDescuento) => {
    onSave(
      {
        ...rrhh,
        conceptosDescuento: rrhh.conceptosDescuento.filter(
          (c) => c.id !== concepto.id,
        ),
      },
      {
        title: "Concepto eliminado",
        description: concepto.nombre,
      },
    );
  };

  if (rrhh.conceptosDescuento.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">
            Catálogo de Descuentos
          </h2>
          <Button size="sm" onClick={() => setShowAdd(true)} disabled={saving}>
            <Plus className="size-4" />
            Nuevo concepto
          </Button>
        </div>
        <div className="rounded-md border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <Percent className="mx-auto mb-2 size-8 text-slate-400" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Aún no tienes conceptos de descuento
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Define aquí los descuentos que se aplicarán a la nómina. Los
            activos se sugieren automáticamente al confeccionar un pago.
          </p>
          <Button
            className="mt-4"
            size="sm"
            onClick={() => setShowAdd(true)}
            disabled={saving}
          >
            <Plus className="size-4" />
            Nuevo concepto
          </Button>
        </div>
        {showAdd && (
          <ConceptoFormDialog
            concepto={null}
            saving={saving}
            onCancel={() => setShowAdd(false)}
            onGuardar={(concepto) => {
              guardar(concepto);
              setShowAdd(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">
            Catálogo de Descuentos ({rrhh.conceptosDescuento.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Conceptos aplicados a la retención salarial de cada trabajador.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} disabled={saving}>
          <Plus className="size-4" />
          Nuevo concepto
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {conceptosOrdenados.map((concepto) => (
          <Card key={concepto.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950 dark:text-slate-50">
                  {concepto.nombre}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {concepto.porcentaje != null
                    ? `${concepto.porcentaje}%`
                    : concepto.porcentaje === null
                      ? "Monto fijo sugerido"
                      : "—"}
                </p>
              </div>
              <Badge
                variant={concepto.activo ? "secondary" : "outline"}
              >
                {concepto.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>

            {concepto.notas && (
              <p className="mt-3 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                {concepto.notas}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditando(concepto)}
                disabled={saving}
              >
                <Edit className="size-4" />
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                onClick={() => setAEliminar(concepto)}
                disabled={saving}
              >
                <Trash2 className="size-4" />
                Eliminar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {(showAdd || editando) && (
        <ConceptoFormDialog
          concepto={editando}
          saving={saving}
          onCancel={() => {
            setShowAdd(false);
            setEditando(null);
          }}
          onGuardar={(concepto) => {
            guardar(concepto);
            setShowAdd(false);
            setEditando(null);
          }}
        />
      )}

      {aEliminar && (
        <Dialog open onOpenChange={() => setAEliminar(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar concepto</DialogTitle>
              <DialogDescription>
                ¿Seguro que deseas eliminar{" "}
                <span className="font-medium">{aEliminar.nombre}</span>? Los
                pagos ya confeccionados conservarán sus descuentos.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAEliminar(null)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={saving}
                onClick={() => {
                  eliminar(aEliminar);
                  setAEliminar(null);
                }}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ConceptoFormDialog({
  concepto,
  saving,
  onCancel,
  onGuardar,
}: {
  concepto: ConceptoDescuento | null;
  saving: boolean;
  onCancel: () => void;
  onGuardar: (concepto: ConceptoDescuento) => void;
}) {
  const [nombre, setNombre] = useState(concepto?.nombre ?? "");
  const [porcentaje, setPorcentaje] = useState(
    concepto?.porcentaje != null ? String(concepto.porcentaje) : "",
  );
  const [activo, setActivo] = useState(concepto?.activo ?? true);
  const [notas, setNotas] = useState(concepto?.notas ?? "");

  const porcentajeNum = porcentaje === "" ? undefined : Number(porcentaje);
  const porcentajeValido = porcentaje === "" || (Number.isFinite(porcentajeNum) && (porcentajeNum ?? 0) >= 0 && (porcentajeNum ?? 0) <= 100);
  const valido = nombre.trim() !== "" && porcentajeValido;

  const ejemplo =
    porcentajeNum != null && Number.isFinite(porcentajeNum) && porcentajeNum !== 0
      ? `Ej: sobre un salario de 2625.00 retendría ${formatMoney((2625 * porcentajeNum) / 100)}`
      : `${formatMoney(0)} — dejar en blanco para introducirlo como monto fijo en el pago.`;

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{concepto ? "Editar concepto" : "Nuevo concepto"}</DialogTitle>
          <DialogDescription>
            Los conceptos activos se sugieren automáticamente al confeccionar
            cada pago.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Nombre del concepto</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Porcentaje sobre el salario (opcional)</Label>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.01"
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
              placeholder="Ej: 5"
            />
            {!porcentajeValido && (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                El porcentaje debe estar entre 0 y 100.
              </p>
            )}
            {porcentajeValido && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{ejemplo}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <div className="space-y-0.5">
              <Label>Concepto activo</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Se propone automáticamente en los pagos.
              </p>
            </div>
            <Switch checked={activo} onCheckedChange={setActivo} />
          </div>

          <div className="grid gap-2">
            <Label>Notas</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button
            disabled={!valido || saving}
            onClick={() => {
              const base: ConceptoDescuento =
                concepto ??
                ({
                  id: nuevoId("concepto"),
                  nombre: "",
                  porcentaje: null,
                  activo: true,
                  notas: "",
                } satisfies ConceptoDescuento);
              onGuardar({
                ...base,
                nombre: nombre.trim(),
                porcentaje: porcentaje === "" ? null : (porcentajeNum ?? 0),
                activo,
                notas: notas.trim(),
              });
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}