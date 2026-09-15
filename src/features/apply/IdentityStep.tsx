import {
  Field,
  FormSection,
  TextField,
  ButtonGroup,
  Dropdown,
  MultiSelect,
  type ButtonGroupOption,
} from '../../primitives/form';
import { toZodiacOptions } from './zodiac';
import { NAME_MAX, EMAIL_MAX, type FieldErrors, type FormState } from './validation';
import type { FormConfig } from '../../services/slopbop';

type Gender = 'male' | 'female';

const GENDER_OPTIONS: ButtonGroupOption<Gender>[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

interface IdentityStepProps {
  config: FormConfig;
  state: FormState;
  patch: (fields: Partial<FormState>) => void;
  errors: FieldErrors;
}

// The opening step: five quick fields, all pickers or short text. Every option
// list (zodiac, genres, the genre cap) comes from the config.
export function IdentityStep({ config, state, patch, errors }: IdentityStepProps) {
  return (
    <FormSection>
      <TextField
        label="Nickname"
        required
        value={state.name}
        onChange={name => patch({ name })}
        maxLength={NAME_MAX}
        error={errors.name}
      />

      <Field label="Gender" required error={errors.gender}>
        <ButtonGroup
          options={GENDER_OPTIONS}
          value={state.gender}
          onChange={gender => patch({ gender })}
          columns={2}
        />
      </Field>

      <Field label="Zodiac sign" required error={errors.zodiac_sign}>
        <Dropdown
          options={toZodiacOptions(config.zodiac)}
          value={state.zodiac}
          onChange={zodiac => patch({ zodiac })}
          placeholder="Select"
          error={!!errors.zodiac_sign}
        />
      </Field>

      <Field
        label="Favorite genres"
        required
        help={`${state.genres.length}/${config.genres.max_select} selected`}
        error={errors.genres}
      >
        <MultiSelect
          options={config.genres.options}
          value={state.genres}
          onChange={genres => patch({ genres })}
          max={config.genres.max_select}
          addPlaceholder="Add a genre…"
        />
      </Field>

      <TextField
        label="Email"
        type="email"
        value={state.email}
        onChange={email => patch({ email })}
        maxLength={EMAIL_MAX}
        placeholder="you@example.com"
        help="optional — how we'd reach you if you're selected"
        error={errors.email}
      />
    </FormSection>
  );
}
