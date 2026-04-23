## ADDED Requirements

### Requirement: System SHALL classify issue category within the legal hierarchy
系统 MUST 基于合法四级分类树进行“问题类型&分类”选择，任何层级选择结果 MUST 为当前父节点下的合法子节点。

#### Scenario: Classification output respects parent-child legality
- **WHEN** 系统为某条客诉内容生成分类路径
- **THEN** 路径中每一层节点均属于上一层节点的合法子节点集合

### Requirement: System SHALL support progressive depth selection from level 1 to level 4
系统 MUST 支持 1~4 层渐进式选择，并在每层独立评估置信度。系统能确定到哪一层就填到哪一层，下层不确定时 MUST 停止继续选择。

#### Scenario: Classification stops at level 3 when level 4 is uncertain
- **WHEN** 系统对第 4 层分类置信不足但第 3 层已可确定
- **THEN** 系统仅填充到第 3 层，不强制选择第 4 层

### Requirement: System SHALL prefer lower-risk outcomes for ambiguous sibling leaves
对于同层级相近叶子（如“催收态度”与“联系紧急联系人”）发生冲突时，系统 MUST 采用保守策略：若无显著优势信号，则停在上一级而不是随机或强制选叶子。

#### Scenario: Ambiguous leaf conflict falls back to upper level
- **WHEN** 客诉文本同时命中多个同层级叶子且分值接近
- **THEN** 系统保持上一级分类结果并留空冲突叶子
