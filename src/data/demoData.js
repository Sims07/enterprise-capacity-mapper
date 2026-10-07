export const DEMO_MODEL = {
  schemaVersion: 2,
  metadata:{name:'Cartographie SI de démonstration',description:'Modèle de capacités et applications Enterprise Architecture',updatedAt:new Date().toISOString()},
  domains:[
    {id:'l0-1',code:'CAP-CRM',name:'Relation & Engagement Client',description:'Gestion du cycle de vie client, prospection et service client.',color:'indigo'},
    {id:'l0-2',code:'CAP-FIN',name:'Finance, Gestion & Comptabilité',description:'Pilotage financier, facturation et trésorerie.',color:'emerald'},
    {id:'l0-3',code:'CAP-SCM',name:'Supply Chain & Logistique',description:'Stocks, approvisionnements et distribution.',color:'amber'},
    {id:'l0-4',code:'CAP-RH',name:'Ressources Humaines & Talent',description:'Gestion du personnel, paie et compétences.',color:'rose'}
  ],
  capabilities:[
    {id:'l1-1',domainId:'l0-1',code:'CRM-01',name:'Gestion des Prospects & Leads',description:'Acquisition et qualification commerciale.'},
    {id:'l1-2',domainId:'l0-1',code:'CRM-02',name:'Gestion des Offres & Devis',description:'Élaboration des prix et devis B2B.'},
    {id:'l1-3',domainId:'l0-1',code:'CRM-03',name:'Support & Service Client (SAV)',description:'Helpdesk, ticketing et réclamations.'},
    {id:'l1-4',domainId:'l0-2',code:'FIN-01',name:'Comptabilité Générale',description:'Grand livre, bilan et comptes sociaux.'},
    {id:'l1-5',domainId:'l0-2',code:'FIN-02',name:'Facturation & Recouvrement',description:'Émission des factures et suivi encaissements.'},
    {id:'l1-6',domainId:'l0-2',code:'FIN-03',name:'Gestion de Trésorerie',description:'Flux bancaires et prévisions de cash.'},
    {id:'l1-7',domainId:'l0-3',code:'SCM-01',name:'Gestion des Stocks & Entrepôt (WMS)',description:'Mouvements d’inventaire et valorisation.'},
    {id:'l1-8',domainId:'l0-3',code:'SCM-02',name:'Achats Fournisseurs',description:'Portail commandes et contrats d’achats.'},
    {id:'l1-9',domainId:'l0-4',code:'RH-01',name:'Gestion de la Paie',description:'Calcul mensuel et cotisations.'},
    {id:'l1-10',domainId:'l0-4',code:'RH-02',name:'Congés & Suivi des Temps',description:'Planning d’équipe et absences.'}
  ],
  applications:[
    {id:'app-1',name:'Salesforce CRM',code:'APP-SFC',type:'SaaS',status:'Actif',vendor:'Salesforce',capabilityIds:['l1-1'],description:'Gestion des pistes commerciales.'},
    {id:'app-2',name:'Zendesk Service',code:'APP-ZND',type:'SaaS',status:'Actif',vendor:'Zendesk',capabilityIds:['l1-3'],description:'Support client et helpdesk.'},
    {id:'app-3',name:'SAP S/4HANA Finance',code:'APP-SAP',type:'ERP',status:'Actif',vendor:'SAP',capabilityIds:['l1-4','l1-5','l1-6'],description:'Comptabilité et bilan groupe.'},
    {id:'app-4',name:'Odoo Invoice',code:'APP-ODO',type:'SaaS',status:'Cible',vendor:'Odoo',capabilityIds:['l1-5'],description:'Solution cible pour la facturation.'},
    {id:'app-5',name:'Manhattan WMS',code:'APP-WMS',type:'On-Premise',status:'Actif',vendor:'Manhattan',capabilityIds:['l1-7'],description:'Gestion des stocks entrepôt.'},
    {id:'app-6',name:'ADP Decidium',code:'APP-ADP',type:'SaaS',status:'Actif',vendor:'ADP',capabilityIds:['l1-9'],description:'Logiciel de paie.'},
    {id:'app-7',name:'Excel Devis Ventes',code:'APP-EXC',type:'Shadow IT',status:'Obsolète',vendor:'Microsoft',capabilityIds:['l1-2'],description:'Macro historique pour chiffrage devis.'}
  ]
};