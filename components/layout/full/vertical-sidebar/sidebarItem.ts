import {
    ApertureIcon,
    CopyIcon, FileIcon, FilesIcon,
    LayoutDashboardIcon, PlugIcon, BuildingIcon, FilePowerIcon, BoltIcon, ToolIcon, RobotIcon, BulbIcon, ChartArrowsVerticalIcon, ChartPie2Icon, ClipboardCheckIcon, CheckboxIcon,
    ZoomCheckIcon, ChartRadarIcon
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
    { header: 'FOTOVOLTAICO' },
    {
        title: 'Usinas',
        icon: BoltIcon,
        to: '/usinas/'
    },
    {
        title: 'Manutenções',
        icon: ToolIcon,
        to: '/manutencoes/'
    },
    {
        title: 'Check-List',
        icon: ClipboardCheckIcon,
        to: '/checklist/', 
        // chip: '★',
        // chipColor: 'primary',
    },

    {
        title: 'Gráficos',
        icon: ChartPie2Icon,
        to: '/graficos/', 
        // chip: '★',
        // chipColor: 'primary',
    }, 

    { header: 'GERENCIAMENTO' },
    {
        title: 'Relatórios',
        icon: FilePowerIcon,
        to: '/relatorios/'
    },
    // {
    //     title: 'Conclusivo',
    //     icon: CheckboxIcon,
    //     to: '/conclusivo/'
    // },
    {
        title: 'Lista de Rateio',
        icon: FilesIcon,                               
        to: '/lista/', 
        // chip: '★',
        chipColor: 'primary',
        // disabled: true, 
        // chip: '[MANUT]',
        // chipColor: 'error'
    },

    { header: `UC PÚBLICAS` },
    {
        title: 'Iluminação',
        icon: BulbIcon,                               
        to: '/iluminacao/', 
        // chip: '★',
        // chipColor: 'primary',
    },
    {
        title: 'Prédios',
        icon: BuildingIcon,                               
        to: '/predios/'
    },

    // { header: 'Mercado Livre' },
    // {
    //     title: 'Controle',
    //     icon: ChartRadarIcon,                               
    //     to: '/controle/', 
    //     // chip: '★',
    //     // chipColor: 'primary',
    // }, 

    // { header: 'PEEHORTO.COM' },
    // {
    //     title: 'Carregadores',
    //     icon: PlugIcon,
    //     to: '/carregadores/'
    // },
    // {
    //     title: 'Análises',
    //     icon: ChartArrowsVerticalIcon,
    //     to: '/analises/', 
    //     // chip: '★',
    //     // chipColor: 'primary',
    // },















    // {
    //     title: 'Contas',
    //     icon: RobotIcon,                               
    //     to: '/contas/',
    //     chip: '[MANUT]',
    //     chipColor: 'error'
    //     // disabled: true
    // },
    
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
