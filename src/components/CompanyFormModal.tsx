import { memo, useEffect, useState } from 'react';
import { View } from 'react-native';

import { FormModal } from '@/components/FormModal';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useCrmStore } from '@/store/crmStore';
import type { Company } from '@/types/models';

interface CompanyFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Provided → edit mode; omitted → add mode. */
  company?: Company;
}

interface FormErrors {
  name?: string;
  industry?: string;
  employees?: string;
}

/** Shared company form used both to add (from the list) and edit (from the
 * detail screen). Owns validation and calls the store. */
const CompanyFormModalComponent = ({ visible, onClose, company }: CompanyFormModalProps) => {
  const addCompany = useCrmStore((state) => state.addCompany);
  const updateCompany = useCrmStore((state) => state.updateCompany);

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [employees, setEmployees] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!visible) return;
    setName(company?.name ?? '');
    setIndustry(company?.industry ?? '');
    setEmployees(company ? String(company.employees) : '');
    setErrors({});
  }, [visible, company]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedIndustry = industry.trim();
    const employeesValue = Number(employees.trim());
    const employeesValid =
      employees.trim().length > 0 && Number.isInteger(employeesValue) && employeesValue > 0;

    const nextErrors: FormErrors = {};
    if (!trimmedName) nextErrors.name = 'Informe o nome.';
    if (!trimmedIndustry) nextErrors.industry = 'Informe o setor.';
    if (!employeesValid) nextErrors.employees = 'Informe um número inteiro maior que 0.';

    setErrors(nextErrors);
    if (!trimmedName || !trimmedIndustry || !employeesValid) return;

    if (company) {
      updateCompany(company.id, {
        name: trimmedName,
        industry: trimmedIndustry,
        employees: employeesValue,
      });
    } else {
      addCompany({ name: trimmedName, industry: trimmedIndustry, employees: employeesValue });
    }
    onClose();
  };

  return (
    <FormModal
      visible={visible}
      title={company ? 'Editar empresa' : 'Nova empresa'}
      onClose={onClose}
    >
      <View className="gap-4">
        <TextField
          label="Nome"
          value={name}
          onChangeText={setName}
          placeholder="Acme Tecnologia"
          error={errors.name}
          autoCapitalize="words"
        />
        <TextField
          label="Setor"
          value={industry}
          onChangeText={setIndustry}
          placeholder="Dados & Analytics"
          error={errors.industry}
          autoCapitalize="words"
        />
        <TextField
          label="Funcionários"
          value={employees}
          onChangeText={setEmployees}
          placeholder="120"
          error={errors.employees}
          keyboardType="number-pad"
        />
        <PrimaryButton
          label={company ? 'Salvar alterações' : 'Salvar empresa'}
          onPress={handleSubmit}
        />
      </View>
    </FormModal>
  );
};

export const CompanyFormModal = memo(CompanyFormModalComponent);
