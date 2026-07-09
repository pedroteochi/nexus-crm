import { memo, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { CompanyPicker, type PickerOption } from '@/components/CompanyPicker';
import { FormModal } from '@/components/FormModal';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useCrmStore } from '@/store/crmStore';
import type { Contact } from '@/types/models';

interface ContactFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Provided → edit mode; omitted → add mode. */
  contact?: Contact;
}

interface FormErrors {
  name?: string;
  email?: string;
  companyId?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shared contact form used both to add (from the list) and edit (from the
 * detail screen). Owns validation and calls the store; the parent only toggles
 * `visible` and optionally passes the `contact` to edit. */
const ContactFormModalComponent = ({ visible, onClose, contact }: ContactFormModalProps) => {
  const companies = useCrmStore((state) => state.companies);
  const addContact = useCrmStore((state) => state.addContact);
  const updateContact = useCrmStore((state) => state.updateContact);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  // Seed the form each time it opens (from `contact` in edit mode, else blank).
  useEffect(() => {
    if (!visible) return;
    setName(contact?.name ?? '');
    setEmail(contact?.email ?? '');
    setCompanyId(contact?.companyId ?? null);
    setErrors({});
  }, [visible, contact]);

  const companyOptions: PickerOption[] = companies.map((company) => ({
    id: company.id,
    name: company.name,
  }));
  const hasCompanies = companies.length > 0;

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const nextErrors: FormErrors = {};
    if (!trimmedName) nextErrors.name = 'Informe o nome.';
    if (!EMAIL_REGEX.test(trimmedEmail)) nextErrors.email = 'Informe um e-mail válido.';
    if (!companyId) nextErrors.companyId = 'Selecione uma empresa.';

    setErrors(nextErrors);
    if (!trimmedName || !EMAIL_REGEX.test(trimmedEmail) || !companyId) return;

    if (contact) {
      updateContact(contact.id, { name: trimmedName, email: trimmedEmail, companyId });
    } else {
      addContact({ name: trimmedName, email: trimmedEmail, companyId });
    }
    onClose();
  };

  return (
    <FormModal
      visible={visible}
      title={contact ? 'Editar contato' : 'Novo contato'}
      onClose={onClose}
    >
      <View className="gap-4">
        <TextField
          label="Nome"
          value={name}
          onChangeText={setName}
          placeholder="Ana Costa"
          error={errors.name}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="ana@empresa.com"
          error={errors.email}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        {hasCompanies ? (
          <CompanyPicker
            label="Empresa"
            options={companyOptions}
            selectedId={companyId}
            onSelect={setCompanyId}
            error={errors.companyId}
          />
        ) : (
          <Text className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Cadastre uma empresa na aba Empresas primeiro, aí você poderá vincular contatos a ela.
          </Text>
        )}
        <PrimaryButton
          label={contact ? 'Salvar alterações' : 'Salvar contato'}
          onPress={handleSubmit}
          disabled={!hasCompanies}
        />
      </View>
    </FormModal>
  );
};

export const ContactFormModal = memo(ContactFormModalComponent);
