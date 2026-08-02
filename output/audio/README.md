# Simulated Conversation Fixtures

All people, companies, events, email addresses, and commitments in this folder are fictional. The fixtures are designed for local demo and regression testing; they must not be presented as real conference recordings.

| Fixture | Scenario | User | Contact |
| --- | --- | --- | --- |
| `simulated-conference` | Clinical documentation partnership | Maya Chen | Daniel Ruiz |
| `simulated-climate-partnership` | Supplier-emissions pilot | Aisha Patel | Marcus Lee |
| `simulated-edtech-research` | Adaptive-learning research study | Owen Brooks | Elena Varga |
| `simulated-cybersecurity-procurement` | Manufacturing security evaluation | Nia Okafor | Victor Chen |
| `simulated-accessibility-collaboration` | Civic-service accessibility testing | Leo Martinez | Sophie Laurent |

Each fixture uses the same file bundle:

- `<name>.m4a`: two-voice synthetic conversation generated with built-in macOS voices
- `<name>-reference.md`: exact script and human-readable expected extraction
- `<name>-expected.json`: machine-readable context, entities, commitments, follow-up requirements, and critical gates
- `<name>-mlx-transcript.txt`: uncorrected MLX Whisper output
