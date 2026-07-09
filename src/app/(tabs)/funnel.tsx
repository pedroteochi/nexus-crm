import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  SectionList,
  Text,
  View,
  type SectionListData,
  type SectionListRenderItemInfo,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Plus } from 'lucide-react-native';

import { ClosedOpportunitiesSheet } from '@/components/ClosedOpportunitiesSheet';
import { IconButton } from '@/components/IconButton';
import { OpportunityCard } from '@/components/OpportunityCard';
import { OpportunityFormModal } from '@/components/OpportunityFormModal';
import { OpportunitySheet } from '@/components/OpportunitySheet';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SkeletonLoading } from '@/components/SkeletonLoading';
import { useCrmStore } from '@/store/crmStore';
import { FUNNEL_STAGES, type Opportunity, type Stage } from '@/types/models';
import { formatCurrency } from '@/utils/opportunity';

// The native (Liquid Glass) tab bar floats over content, so the list needs extra
// bottom clearance; the JS tab bar in Expo Go reserves its own space (fixed offset).
const nativeTabs = Constants.appOwnership !== 'expo';

/** A funnel row is either a real opportunity or a per-stage "empty" placeholder. */
type EmptyRow = { __empty: true; stageId: string };
type Row = Opportunity | EmptyRow;
const isEmptyRow = (row: Row): row is EmptyRow => '__empty' in row;

interface FunnelSection {
  stage: Stage;
  sum: number;
  count: number;
  data: Row[];
}

const ItemSeparator = () => <View className="h-2" />;
const SectionFooter = () => <View className="h-4" />;

export default function FunnelScreen() {
  const opportunities = useCrmStore((state) => state.opportunities);
  const contacts = useCrmStore((state) => state.contacts);
  const hasHydrated = useCrmStore((state) => state.hasHydrated);

  const insets = useSafeAreaInsets();
  // Clearance so the last list row clears whichever tab bar is active.
  const listPadBottom = nativeTabs ? insets.bottom + 100 : 96;
  const listRef = useRef<SectionList<Row, FunnelSection>>(null);
  const pendingJump = useRef<number | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStageId, setCreateStageId] = useState<string | undefined>(undefined);
  const [editId, setEditId] = useState<string | null>(null);
  const [closedOpen, setClosedOpen] = useState(false);

  const nameOf = useMemo(() => {
    const map = new Map(contacts.map((contact) => [contact.id, contact.name]));
    return (id: string) => map.get(id) ?? 'Sem contato';
  }, [contacts]);

  const openOpps = useMemo(
    () => opportunities.filter((opp) => opp.status === 'open'),
    [opportunities],
  );

  const byStage = useMemo(() => {
    const groups = new Map<string, Opportunity[]>();
    for (const stage of FUNNEL_STAGES) groups.set(stage.id, []);
    for (const opp of openOpps) groups.get(opp.stageId)?.push(opp);
    return groups;
  }, [openOpps]);

  const sections = useMemo<FunnelSection[]>(
    () =>
      FUNNEL_STAGES.map((stage) => {
        const opps = byStage.get(stage.id) ?? [];
        const sum = opps.reduce((acc, opp) => acc + opp.value, 0);
        const data: Row[] = opps.length ? opps : [{ __empty: true, stageId: stage.id }];
        return { stage, sum, count: opps.length, data };
      }),
    [byStage],
  );

  const totalOpen = useMemo(() => openOpps.reduce((acc, opp) => acc + opp.value, 0), [openOpps]);

  const closedCount = useMemo(
    () => opportunities.reduce((acc, opp) => (opp.status === 'open' ? acc : acc + 1), 0),
    [opportunities],
  );

  const editingOpp = useMemo(
    () => opportunities.find((opp) => opp.id === editId),
    [opportunities, editId],
  );

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  const openCreate = useCallback((stageId?: string) => {
    setCreateStageId(stageId);
    setCreateOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setCreateOpen(false);
    setEditId(null);
  }, []);

  const handleEdit = useCallback((id: string) => {
    setSelectedId(null);
    // Let the sheet dismiss before presenting the form (iOS one-modal-at-a-time).
    setTimeout(() => setEditId(id), Platform.OS === 'ios' ? 320 : 0);
  }, []);

  const jumpToStage = useCallback((sectionIndex: number) => {
    pendingJump.current = sectionIndex;
    listRef.current?.scrollToLocation({ sectionIndex, itemIndex: 0, viewOffset: 0, animated: true });
  }, []);

  const handleScrollToIndexFailed = useCallback(() => {
    const sectionIndex = pendingJump.current;
    if (sectionIndex == null) return;
    // Rows weren't measured yet — let a frame pass and retry the same jump. With a
    // sticky header always naming the stage, even an imperfect landing re-orients.
    requestAnimationFrame(() => {
      listRef.current?.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        viewOffset: 0,
        animated: true,
      });
    });
  }, []);

  const keyExtractor = useCallback(
    (item: Row) => (isEmptyRow(item) ? `empty-${item.stageId}` : item.id),
    [],
  );

  const renderItem = useCallback(
    ({ item, section }: SectionListRenderItemInfo<Row, FunnelSection>) => (
      <View className="px-4">
        {isEmptyRow(item) ? (
          <Pressable
            onPress={() => openCreate(item.stageId)}
            accessibilityRole="button"
            accessibilityLabel={`Adicionar oportunidade em ${section.stage.label}`}
            className="flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 py-4 active:opacity-70 dark:border-zinc-700"
          >
            <Plus color="#a1a1aa" size={16} />
            <Text className="text-sm text-zinc-400 dark:text-zinc-500">Nova aqui</Text>
          </Pressable>
        ) : (
          <OpportunityCard
            opportunity={item}
            contactName={nameOf(item.contactId)}
            stageColor={section.stage.color}
            onPress={handleSelect}
          />
        )}
      </View>
    ),
    [nameOf, handleSelect, openCreate],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<Row, FunnelSection> }) => (
      <View className="flex-row items-center gap-2 bg-white px-4 py-2 dark:bg-zinc-950">
        <View style={{ backgroundColor: section.stage.color }} className="h-2.5 w-2.5 rounded-full" />
        <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {section.stage.label}
        </Text>
        <Text className="text-xs text-zinc-400 dark:text-zinc-500">{section.count}</Text>
        <Text className="ml-auto text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {formatCurrency(section.sum)}
        </Text>
      </View>
    ),
    [],
  );

  // The pipeline strip: a glanceable, R$-weighted shape of the whole funnel that
  // doubles as tap-to-jump navigation. Exact numbers live in the sticky headers.
  const listHeader = useMemo(
    () => (
      <View className="px-4 pb-3 pt-1">
        <View className="flex-row items-center gap-1">
          {sections.map((section, index) => {
            const share = totalOpen > 0 ? section.sum / totalOpen : 1 / sections.length;
            return (
              <Pressable
                key={section.stage.id}
                onPress={() => jumpToStage(index)}
                accessibilityRole="button"
                accessibilityLabel={`Ir para ${section.stage.label}`}
                style={{ flex: Math.max(0.06, share) }}
                className="py-1"
              >
                <View
                  style={{
                    backgroundColor: section.stage.color,
                    opacity: section.count ? 1 : 0.25,
                  }}
                  className="h-2.5 rounded-full"
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    ),
    [sections, totalOpen, jumpToStage],
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-zinc-950">
      <ScreenHeader
        title="Funil"
        subtitle={`${openOpps.length} em aberto · ${formatCurrency(totalOpen)}`}
        action={
          <View className="flex-row items-center gap-1">
            {closedCount > 0 ? (
              <Pressable
                onPress={() => setClosedOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`${closedCount} oportunidades fechadas`}
                className="flex-row items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 active:opacity-70 dark:bg-zinc-800"
              >
                <Text className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Fechadas
                </Text>
                <Text className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                  {closedCount}
                </Text>
              </Pressable>
            ) : null}
            <IconButton onPress={() => openCreate()} accessibilityLabel="Nova oportunidade">
              <Plus color="#4f46e5" size={24} />
            </IconButton>
          </View>
        }
      />

      {!hasHydrated ? (
        <SkeletonLoading />
      ) : (
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          renderSectionFooter={SectionFooter}
          ListHeaderComponent={listHeader}
          ItemSeparatorComponent={ItemSeparator}
          stickySectionHeadersEnabled
          onScrollToIndexFailed={handleScrollToIndexFailed}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: listPadBottom }}
        />
      )}

      <OpportunitySheet
        opportunityId={selectedId}
        onClose={() => setSelectedId(null)}
        onEdit={handleEdit}
      />
      <OpportunityFormModal
        visible={createOpen || Boolean(editId)}
        opportunity={editingOpp}
        presetStageId={createStageId}
        onClose={closeForm}
      />
      <ClosedOpportunitiesSheet visible={closedOpen} onClose={() => setClosedOpen(false)} />
    </SafeAreaView>
  );
}
