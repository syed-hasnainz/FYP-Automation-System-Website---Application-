import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function PolicyModal({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>FYP Registration Policy</Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator>
            <Section title="Eligibility Criteria:">
              <Bullet>Minimum CGPA of 2.5 required for automatic approval</Bullet>
              <Bullet>All prerequisite courses must be completed</Bullet>
              <Bullet>Students in final year of their program</Bullet>
              <Bullet>
                Good academic standing with no pending disciplinary actions
              </Bullet>
            </Section>
            <Section title="Conditional Registration:">
              <Bullet>
                Students with CGPA below 2.5 OR incomplete prerequisites may
                register conditionally
              </Bullet>
              <Bullet>
                Conditional students must complete missing prerequisites in
                summer semester
              </Bullet>
              <Bullet>
                Must maintain satisfactory progress throughout FYP duration
              </Bullet>
              <Bullet>Subject to committee approval and monitoring</Bullet>
            </Section>
            <Section title="Student Commitments:">
              <Bullet>Regular attendance and participation in FYP activities</Bullet>
              <Bullet>Timely submission of all deliverables and reports</Bullet>
              <Bullet>
                Professional conduct with supervisors and team members
              </Bullet>
              <Bullet>Adherence to university academic integrity policies</Bullet>
              <Bullet>
                Completion of all project milestones within specified timelines
              </Bullet>
            </Section>
            <Section title="Important Notes:">
              <Bullet>Registration is subject to committee approval</Bullet>
              <Bullet>False information may lead to registration cancellation</Bullet>
              <Bullet>All documents must be authentic and verifiable</Bullet>
              <Bullet>Students are responsible for keeping track of deadlines</Bullet>
            </Section>
          </ScrollView>
          <Pressable style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>I Understand</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ children }: { children: string }) {
  return <Text style={styles.bullet}>• {children}</Text>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '85%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  scroll: { maxHeight: 360, marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803d',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
    paddingLeft: 4,
  },
  btn: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
