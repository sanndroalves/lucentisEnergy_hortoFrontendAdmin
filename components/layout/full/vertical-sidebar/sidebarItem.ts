import {
    ApertureIcon,
    CopyIcon, FileIcon,
    LayoutDashboardIcon, PlugIcon, BuildingIcon, FilePowerIcon, BoltIcon, ToolIcon, RobotIcon, BulbIcon, ChartArrowsVerticalIcon, ChartPie2Icon, ClipboardCheckIcon
} from 'vue-tabler-icons';

export interface menu {
    header?: string;
    title?: string;
    icon?: any;
    to?: string;
    chip?: string;
    chipColor?: string;
    chipVariant?: string;
    chipIcon?: string;
    children?: menu[];
    disabled?: boolean;
    type?: string;
    subCaption?: string;
}

const sidebarItem: menu[] = [
    { header: 'início' },
    {
        title: 'Painel',
        icon: LayoutDashboardIcon,
        to: '/'
    },
    { header: 'SOLAR' },
    {
        title: 'Usinas',
        icon: BoltIcon,
        to: '/usinas/'
    },
    
    {
        title: 'Check-List',
        icon: ClipboardCheckIcon,
        to: '/checklist/'
    },

    {
        title: 'Gráficos',
        icon: ChartPie2Icon,
        to: '/graficos/'
    },
    {
        title: 'Manutenções',
        icon: ToolIcon,
        to: '/manutencoes/'
    },
    { header: 'PEEHORTO.COM' },
    {
        title: 'Carregadores',
        icon: PlugIcon,
        to: '/carregadores/'
    },
    {
        title: 'Análises',
        icon: ChartArrowsVerticalIcon,
        to: '/analises/'
    },
     
    { header: 'UNIDADES CONSUMIDORAS' },
    {
        title: 'Iluminação Pública',
        icon: BulbIcon,                               
        to: '/iluminacao/'
    },
    {
        title: 'Prédios Públicos',
        icon: BuildingIcon,                               
        to: '/predios/'
    },
    {
        title: 'Lista de Rateio',
        icon: FileIcon,                               
        to: '/',
        disabled: true,
        chip: 'NOVO'
    },
    
    { header: 'GERENCIAMENTO' },
    {
        title: 'Relatórios',
        icon: FilePowerIcon,
        to: '/relatorios/'
    },
    {
        title: 'Contas (Manu.)',
        icon: RobotIcon,                               
        to: '/contas/'
    },
    
    // {
    //     title: 'Shadow',
    //     icon: CopyIcon,
    //     to: '/ui/shadow'
    // },
    // { header: 'auth' },
    // {
    //     title: 'Login',
    //     icon: LoginIcon,
    //     to: '/auth/login'
    // },
    // {
    //     title: 'Register',
    //     icon: UserPlusIcon,
    //     to: '/auth/register'
    // },
    // { header: 'Extra' },
    // {
    //     title: 'Icons',
    //     icon: MoodHappyIcon,
    //     to: '/icons'
    // },
    // {
    //     title: 'Sample Page',
    //     icon: ApertureIcon,
    //     to: '/sample-page'
    // },
];

export default sidebarItem;
