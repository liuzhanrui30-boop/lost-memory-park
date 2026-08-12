import type { StoryBeat } from '../v2/types';

/** Short, causal story beats: identity -> experiment -> director -> choice. */
const CHAPTER_STORY:Record<number,readonly StoryBeat[]>={
  1:[
    {speaker:'白偶',text:'我醒在自己设计的糖果广场，却忘了为什么把门锁上。',objective:'沿着跑道前进，找回第一段记忆。'},
    {speaker:'广播',text:'这里原本是“服从实验”：把人的痛苦做成游戏，看他们会不会继续微笑。',objective:'先学会看预警，再通过假平台和糖浆。'},
    {speaker:'白偶',text:'我以为自己只是受试者。记录上的签名却和我的手一模一样。',objective:'穿过糖果机器，确认这份记录是不是我的。'},
    {speaker:'白偶',text:'没有观众，掌声却一直响。有人在后台把每次失败都记了下来。',objective:'避开舞台机关，找到被藏起来的实验记录。'},
    {speaker:'广播',text:'你不是被困在乐园里，你正在一遍遍重演自己做过的事。',objective:'把已经学会的机关组合起来。'},
    {speaker:'白偶',text:'如果这座乐园真是我建的，那门后的园长也不会是陌生人。',objective:'完成糖果广场的最后排练，面对第一个园长程序。'},
  ],
  2:[
    {speaker:'白偶',text:'糖果机器吐出的记忆证明：我曾把失败当成实验数据。',objective:'进入马戏团，查清谁在操纵掌声。'},
    {speaker:'白偶',text:'我没有救出那些演员，只给他们安排了更难的下一幕。',objective:'用弹床和炮火穿过第二章的练习场。'},
    {speaker:'广播',text:'观众席从未坐过真人。掌声只是机器确认“实验还在继续”。',objective:'在灯光和攻击线之间找到前进节奏。'},
    {speaker:'白偶',text:'园长把“再来一次”说得像安慰，其实那是系统的指令。',objective:'别追掌声，先关闭舞台上的远程机关。'},
    {speaker:'白偶',text:'演员名单里有我的名字，也有一个叫“笑脸园长”的名字。',objective:'通过马戏团终局，拿到完整名单。'},
    {speaker:'广播',text:'你已经知道这不是逃生秀。下一章的镜子会告诉你，谁在替你说话。',objective:'完成 Boss 的全部阶段，打开镜厅。'},
  ],
  3:[
    {speaker:'镜中人',text:'我不是另一个怪物，我是你删掉的那部分记忆：会犹豫，也会反对你。',objective:'进入镜厅，分清自己和倒影。'},
    {speaker:'白偶',text:'为了让实验继续，我删除了会说“不”的人格。',objective:'利用相位平台，追上被删掉的声音。'},
    {speaker:'镜中人',text:'镜像不会替你做选择，它只把你刚才的选择再演一遍。',objective:'观察延迟和方向，别照着错误路线返回。'},
    {speaker:'白偶',text:'现实里有人一直等我醒来。她寄来的信没有要求我忘记。',objective:'在真假出口之间保住这封信的记忆。'},
    {speaker:'白偶',text:'我终于想起来了：园长是我留下的执行人格，负责让机器永不停止。',objective:'穿过镜像终局，夺回机器的控制权。'},
    {speaker:'园长',text:'你想见我，就先承认一件事：我做的每个决定，都来自你。',objective:'完成镜像 Boss 的全部阶段。'},
  ],
  4:[
    {speaker:'白偶',text:'焚化许可上有我的签字。我曾想把痛苦删掉，而不是承担它。',objective:'进入城堡，找到总电闸。'},
    {speaker:'白偶',text:'我主动躺进机器，把自己分成“忘记的人”和“控制的人”。',objective:'沿输送带逆行，找回剩下的证据。'},
    {speaker:'园长',text:'只要你继续闯关，我就能证明：人宁愿重来，也不愿记得。',objective:'关闭园长的追逐机关，不再按他的规则表演。'},
    {speaker:'白偶',text:'记忆不是通行证，也不是奖杯。它们说明我做过什么。',objective:'把前三章学过的机关逐一反制。'},
    {speaker:'白偶',text:'总闸就在最后一扇门后。拉下它，乐园会停，过去却不会消失。',objective:'完成城堡终局，直面笑脸园长。'},
    {speaker:'白偶',text:'我现在记得自己是谁，也终于可以决定醒来后怎么做。',objective:'完成 Boss 阶段，进入终章作出回答。'},
  ],
};
export const PROLOGUE_STORY:StoryBeat={speaker:'广播',text:'欢迎回来，首席设计师。你把痛苦做成了乐园，又抹掉了自己的记忆。现在沿路线找回证据。',objective:'看完指示牌，先活下来，不必一次完美。'};
export const BOSS_STORY:Record<number,StoryBeat>={
  1:{speaker:'迎宾程序',text:'我只会重复你写下的欢迎词。每一次“欢迎回来”，都在提醒你曾经来过。',objective:'躲过规定攻势，再依次关闭阶段机关。'},
  2:{speaker:'提线团长',text:'掌声不是奖励，是实验还没结束的证明。拒绝它，舞台才会停。',objective:'完成所有攻击波，拒绝被掌声牵着走。'},
  3:{speaker:'镜像玩家',text:'我替你保管了“不愿面对”的部分。打败我，不等于删除我。',objective:'识别镜像攻击，完成全部阶段。'},
  4:{speaker:'笑脸园长',text:'我不是你的敌人。我是你为了逃避责任，亲手留下的管理员。',objective:'完成最后四阶段，进入终章决定乐园的命运。'},
};
export const EPILOGUE_STORY:StoryBeat={speaker:'白偶',text:'机器停了。现在没有正确答案：你可以带着找到的记忆离开，也可以完整地面对过去。',objective:'向右关闭循环；档案完整时，向左选择“带着全部记忆醒来”。'};
export function roomStory(chapter:number,step:number):StoryBeat{const list=CHAPTER_STORY[Math.max(1,Math.min(4,chapter))]??CHAPTER_STORY[1];return list[Math.max(0,Math.min(list.length-1,Math.floor(step)))];}
