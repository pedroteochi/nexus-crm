import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { CompanyPicker, type PickerOption } from '@/components/CompanyPicker';
import { FormModal } from '@/components/FormModal';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import type { DealDraft } from '@/services/openai';
import { useCrmStore } from '@/store/crmStore';
import { FUNNEL_STAGES, type Opportunity } from '@/types/models';

interface OpportunityFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Provided → edit mode. */
  opportunity?: Opportunity;
  /** Pre-select a contact when creating (e.g. from a contact detail). */
  presetContactId?: string;
  /** Pre-select the stage when creating (e.g. from an empty funnel column). */
  presetStageId?: string;
  /** AI draft: pre-fill the title. */
  presetTitle?: string;
  /** AI draft: pre-fill the value (R$); 0/absent leaves it blank for the rep. */
  presetValue?: number;
  /** AI draft: one-line rationale, shown in an "✨ IA sugeriu" banner. */
  draftRationale?: string;
  draftConfidence?: DealDraft['confidence'];
}

interface FormErrors {
  title?: string;
  contactId?: string;
  value?: string;
}

const CONFIDENCE: Record<DealDraft['confidence'], { label: string; pill: string; text: string }> = {
  alta: {
    label: 'confiança alta',
    pill: 'bg-emerald-100 dark:bg-emerald-950/50',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  media: {
    label: 'confiança média',
    pill: 'bg-amber-100 dark:bg-amber-950/50',
    text: 'text-amber-700 dark:text-amber-300',
  },
  baixa: {
    label: 'confiança baixa',
    pill: 'bg-zinc-200 dark:bg-zinc-800',
    text: 'text-zinc-600 dark:text-zinc-300',
  },
};

const OpportunityFormModalComponent = ({
  visible,
  onClose,
  opportunity,
  presetContactId,
  presetStageId,
  presetTitle,
  presetValue,
  draftRationale,
  draftConfidence,
}: OpportunityFormModalProps) => {
  const contacts = useCrmStore((state) => state.contacts);
  const addOpportunity = useCrmStore((state) => state.addOpportunity);
  const updateOpportunity = useCrmStore((state) => state.updateOpportunity);

  const [title, setTitle] = useState('');
  const [contactId, setContactId] = useState<string | null>(null);
  const [owner, setOwner] = useState('Você');
  const [value, setValue] = useState('');
  const [stageId, setStageId] = useState<string>(FUNNEL_STAGES[0]?.id ?? 'novo');
  const [errors, setErrors] = useState<FormErrors>({});
  // Latches false-positive double submits during the modal's dismiss animation.
  const submittingRef = useRef(false);

  // Keep rendering the entity we were opened with through the iOS close animation:
  // the modal stays mounted during the ~300ms slide-out, and if `opportunity` goes
  // undefined mid-dismiss the form would flash its create-mode chrome. Latching the
  // last value while visible avoids that flash without affecting the open path.
  const shownOppRef = useRef(opportunity);
  if (visible) shownOppRef.current = opportunity;
  const shownOpp = visible ? opportunity : shownOppRef.current;
  const isEditing = Boolean(shownOpp);
  const aiDrafted = Boolean(draftRationale);

  // Seed ONLY on the open (false->true) transition, never on later prop changes.
  // Otherwise a late-resolving AI draft whose presets change while the form is
  // already open would overwrite whatever the rep is typing.
  const wasVisibleRef = useRef(false);
  useEffect(() => {
    const opening = visible && !wasVisibleRef.current;
    wasVisibleRef.current = visible;
    if (!opening) return;
    setTitle(opportunity?.title ?? presetTitle ?? '');
    setContactId(opportunity?.contactId ?? presetContactId ?? null);
    setOwner(opportunity?.owner ?? 'Você');
    setValue(
      opportunity
        ? String(opportunity.value)
        : presetValue && presetValue > 0
          ? String(presetValue)
          : '',
    );
    setStageId(opportunity?.stageId ?? presetStageId ?? FUNNEL_STAGES[0]?.id ?? 'novo');
    setErrors({});
    submittingRef.current = false;
  }, [visible, opportunity, presetContactId, presetStageId, presetTitle, presetValue]);

  const contactOptions: PickerOption[] = useMemo(
    () => contacts.map((contact) => ({ id: contact.id, name: contact.name })),
    [contacts],
  );
  const hasContacts = contacts.length > 0;

  const handleSubmit = () => {
    if (submittingRef.current) return;

    const trimmedTitle = title.trim();
    // Preserva o separador decimal (vírgula pt-BR vira ponto). Descartar tudo que
    // não é dígito transformava "48000.5" (valor vindo do banco no modo edição)
    // em 480005 — inflando o negócio 10x. Entrada malformada vira NaN e cai na
    // validação abaixo.
    const numericValue = Number(value.replace(',', '.').replace(/[^\d.]/g, ''));
    const valueValid = Number.isFinite(numericValue) && numericValue > 0;

    const nextErrors: FormErrors = {};
    if (!trimmedTitle) nextErrors.title = 'Informe um título.';
    if (!isEditing && !contactId) nextErrors.contactId = 'Selecione o contato.';
    if (!valueValid) nextErrors.value = 'Informe um valor maior que 0.';

    setErrors(nextErrors);
    if (!trimmedTitle || (!isEditing && !contactId) || !valueValid) return;

    submittingRef.current = true;
    if (opportunity) {
      updateOpportunity(opportunity.id, {
        title: trimmedTitle,
        owner: owner.trim() || 'Você',
        value: numericValue,
      });
    } else if (contactId) {
      addOpportunity({
        title: trimmedTitle,
        contactId,
        owner: owner.trim() || 'Você',
        value: numericValue,
        stageId,
      });
    }
    onClose();
  };

  return (
    <FormModal
      visible={visible}
      title={isEditing ? 'Editar oportunidade' : 'Nova oportunidade'}
      onClose={onClose}
    >
      <View className="gap-4">
        {aiDrafted ? (
          <View className="flex-row items-start gap-2 rounded-xl bg-indigo-50 px-3.5 py-3 dark:bg-indigo-500/15">
            <Sparkles color="#6366f1" size={16} />
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                  IA sugeriu
                </Text>
                {draftConfidence ? (
                  <View className={`rounded-full px-2 py-0.5 ${CONFIDENCE[draftConfidence].pill}`}>
                    <Text className={`text-[10px] font-medium ${CONFIDENCE[draftConfidence].text}`}>
                      {CONFIDENCE[draftConfidence].label}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="mt-1 text-xs leading-4 text-indigo-800/90 dark:text-indigo-200/90">
                {draftRationale} Revise e ajuste antes de criar.
              </Text>
            </View>
          </View>
        ) : null}

        <TextField
          label="Título"
          value={title}
          onChangeText={setTitle}
          placeholder="Plano Enterprise — 50 licenças"
          error={errors.title}
          autoCapitalize="sentences"
        />
        {isEditing ? null : hasContacts ? (
          <CompanyPicker
            label="Contato"
            options={contactOptions}
            selectedId={contactId}
            onSelect={setContactId}
            error={errors.contactId}
            placeholder="Selecione o contato"
          />
        ) : (
          <Text className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Cadastre um contato primeiro para vincular a oportunidade.
          </Text>
        )}

        {isEditing ? null : (
          <View className="gap-2">
            <Text className="px-0.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">Etapa</Text>
            <View className="flex-row flex-wrap gap-2">
              {FUNNEL_STAGES.map((stage) => {
                const active = stage.id === stageId;
                return (
                  <Pressable
                    key={stage.id}
                    onPress={() => setStageId(stage.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Etapa ${stage.label}`}
                    accessibilityState={{ selected: active }}
                    className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 active:opacity-70 ${
                      active
                        ? 'border-primary bg-indigo-50 dark:bg-indigo-500/15'
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <View style={{ backgroundColor: stage.color }} className="h-2 w-2 rounded-full" />
                    <Text
                      className={`text-xs font-medium ${
                        active
                          ? 'text-primary dark:text-indigo-300'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {stage.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <TextField
          label="Responsável"
          value={owner}
          onChangeText={setOwner}
          placeholder="Você"
          autoCapitalize="words"
        />
        <View className="gap-1">
          <TextField
            label="Valor (R$)"
            value={value}
            onChangeText={setValue}
            placeholder="12000"
            error={errors.value}
            keyboardType="number-pad"
          />
          {aiDrafted && value.trim() === '' && !errors.value ? (
            <Text className="px-0.5 text-xs text-zinc-400 dark:text-zinc-500">
              A IA não identificou um valor na conversa — confirme o valor do negócio.
            </Text>
          ) : null}
        </View>

        <PrimaryButton
          label={isEditing ? 'Salvar alterações' : 'Criar oportunidade'}
          onPress={handleSubmit}
          disabled={!isEditing && !hasContacts}
        />
      </View>
    </FormModal>
  );
};

export const OpportunityFormModal = memo(OpportunityFormModalComponent);
