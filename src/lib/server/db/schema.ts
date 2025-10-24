import {
	sqliteTable,
	text,
	integer,
	primaryKey,
	unique,
	type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { getTableName, sql } from 'drizzle-orm';
import { type ActivityType } from '$lib/activity-types';
import type { CampaignStatuses, DiscoveryStatuses } from '$lib/statuses';

export type TableNameUnion<Tables extends readonly { _: { name: string } }[]> =
	Tables[number]['_']['name'];

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	impersonatePartnerId: integer('impersonate_partner_id'),
	impersonateContactId: integer('impersonate_contact_id'),
	impersonatePartnerNetsuiteId: integer('impersonate_partner_netsuite_id'),
	impersonateContactNetsuiteId: integer('impersonate_contact_netsuite_id'),
});

export const entities = sqliteTable('entities', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	netsuiteId: integer('netsuite_id'),
	entityType: text('entity_type').notNull().$type<'company' | 'individual' | 'employee'>(),
	name: text('name').notNull(),
	avatarUrl: text('avatar_url'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
});

// Company-specific details
export const companies = sqliteTable('companies', {
	entityId: integer('entity_id')
		.primaryKey()
		.references(() => entities.id, { onDelete: 'cascade' }),
	legalName: text('legal_name'),
	businessRegistrationNumber: text('business_registration_number'),
	industry: text('industry'),
	size: text('size'),
});

// Individual-specific details
export const individuals = sqliteTable('individuals', {
	entityId: integer('entity_id')
		.primaryKey()
		.references(() => entities.id, { onDelete: 'cascade' }),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	title: text('title'),
	externalAuthId: text('external_auth_id'),
});

// Department hierarchy
export const departments = sqliteTable('departments', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	description: text('description'),
	managerEntityId: integer('manager_entity_id').references(() => entities.id),
	parentDepartmentId: integer('parent_department_id').references(
		(): AnySQLiteColumn => departments.id
	),
});

// Employee-specific details
export const employees = sqliteTable('employees', {
	entityId: integer('entity_id')
		.primaryKey()
		.references(() => entities.id, { onDelete: 'cascade' }),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	title: text('title'),
	hireDate: text('hire_date'),
	hrId: text('hr_id'),
	status: text('status').notNull().default('active'),
	departmentId: integer('department_id').references(() => departments.id),
	externalAuthId: text('external_auth_id'),
});

// Employee Missive keys for example.
export const userCredentials = sqliteTable('user_credentials', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userEntityId: integer('user_entity_id').notNull(),
	provider: text('provider').notNull(), // 'missive'
	ciphertextB64: text('ciphertext_b64').notNull(),
	ivB64: text('iv_b64').notNull(),
	dekWrappedB64: text('dek_wrapped_b64').notNull(),
	dekIvB64: text('dek_iv_b64').notNull(),
	keyVersion: integer('key_version').notNull(),
	fingerprintB64: text('fingerprint_b64').notNull(),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull(),
});

export type UserCredentialData = typeof userCredentials.$inferSelect;

// Partner business relationship data
export const partners = sqliteTable('partners', {
	entityId: integer('entity_id')
		.primaryKey()
		.references(() => entities.id, { onDelete: 'cascade' }),
	demoDate: text('demo_date'),
	demoByEntityId: integer('demo_by_entity_id').references(() => entities.id),
	msaSigned: integer('msa_signed', { mode: 'boolean' }).default(false),
	msaSignedDate: text('msa_signed_date'),
	startDate: text('start_date'),
	status: text('status')
		.notNull()
		.default('prospect')
		.$type<'prospect' | 'active' | 'inactive' | 'terminated'>(),
	partnerType: text('partner_type').$type<'white_label' | 'self_serve' | 'd2b' | 'reseller'>(),
	acquisitionSource: text('acquisition_source'),
	totalMonthlyRevenue: integer('total_monthly_revenue'),
	availableCurrencies: text('available_currencies'),
	defaultCurrency: text('default_currency'),
	analyticsFolderId: text('analytics_folder_id'),
	googleDriveLink: text('google_drive_link'),
	externalId: text('external_id'),
	isOnboarded: integer('is_onboarded', { mode: 'boolean' }).default(false),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
});

// Relationships between entities
export const entityRelationships = sqliteTable('entity_relationships', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	parentEntityId: integer('parent_entity_id')
		.notNull()
		.references(() => entities.id, { onDelete: 'cascade' }),
	childEntityId: integer('child_entity_id')
		.notNull()
		.references(() => entities.id, { onDelete: 'cascade' }),
	relationshipType: text('relationship_type')
		.notNull()
		.$type<'contact' | 'account_manager' | 'client' | 'referred_by'>(),
	relationshipSubtype: text('relationship_subtype').$type<'primary' | 'admin' | 'billing' | 'technical'>(),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
});

// Contact information for any entity
export const entityContacts = sqliteTable('entity_contacts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	entityId: integer('entity_id')
		.notNull()
		.references(() => entities.id),
	contactType: text('contact_type').notNull().$type<'email' | 'phone' | 'address'>(),
	contactValue: text('contact_value').notNull(),
	contactLabel: text('contact_label').notNull().default('work'),
	isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
});

// SEO campaigns
export const campaigns = sqliteTable('campaigns', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	siteOwnerEntityId: integer('site_owner_entity_id').references(() => entities.id),
	partnerEntityId: integer('partner_entity_id')
		.notNull()
		.references(() => entities.id),
	siteUrl: text('site_url').notNull(),
	status: text('status').notNull().default('prospect').$type<CampaignStatuses>(),
	serviceType: text('service_type').$type<'managed' | 'link_building'>(),
	profileType: text('profile_type').$type<
		'service_area' | 'ecommerce' | 'single_location' | 'multi_location' | 'other'
	>(),
	budgetAmountCents: integer('budget_amount_cents'),
	budgetPeriod: text('budget_period').$type<
		'year' | 'month' | 'quarter' | 'week' | 'day' | 'fixed'
	>(),
	onboardDate: text('onboard_date'),
	onboardedByEntityId: integer('onboarded_by_entity_id').references(() => entities.id),
	onboardingDueDate: text('onboarding_due_date'),
	campaignStartDate: text('campaign_start_date'),
	cancellationRequestDate: text('cancellation_request_date'),
	offboardDate: text('offboard_date'),
	offboardedByEntityId: integer('offboarded_by_entity_id').references(() => entities.id),
	aaDashboardUrl: text('aa_dashboard_url'),
	aaCampaignId: text('aa_campaign_id'),
	partnerShareableUrl: text('partner_shareable_url'),
	execlinkId: text('execlink_id'),
	campaignDoc: text('campaign_doc'),
	billingContractId: text('billing_contract_id'),
	isOnboarded: integer('is_onboarded', { mode: 'boolean' }).default(false),
	campaignProfileId: integer('campaign_profile_id').references(() => campaignProfiles.id, { onDelete: 'set null' }),
	campaignShareUuid: text('campaign_share_uuid'),
	campaignPlanUrl: text('campaign_plan_url'),
	totalBilledCents: integer('total_billed_cents').default(0),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
});

// Campaign plans for managing different types of campaign planning
export const campaignPlans = sqliteTable('campaign_plans', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	campaignId: integer('campaign_id')
		.notNull()
		.references(() => campaigns.id, { onDelete: 'cascade' }),
	type: text('type')
		.notNull()
		.$type<'content' | 'links' | 'gbp' | 'specialist' | 'technical' | 'onsite' | 'local'>(),
	status: text('status')
		.notNull()
		.default('active')
		.$type<'active' | 'paused' | 'archived'>(),
	public: integer('public', { mode: 'boolean' })
		.notNull()
		.default(true),
	editMode: integer('edit_mode', { mode: 'boolean' })
		.notNull()
		.default(true),
	feedbackCount: integer('feedback_count')
		.notNull()
		.default(0),
	feedbackSentiment: text('feedback_sentiment')
		.$type<'positive' | 'negative' | 'neutral' | 'mixed'>(),
	planLead: integer('plan_lead').references(() => entities.id),
	executionLead: integer('execution_lead').references(() => entities.id)
});

// Campaign team assignments
export const campaignAssignments = sqliteTable(
	'campaign_assignments',
	{
		campaignId: integer('campaign_id')
			.notNull()
			.references(() => campaigns.id, { onDelete: 'cascade' }),
		employeeEntityId: integer('employee_entity_id')
			.notNull()
			.references(() => entities.id),
		assignmentType: text('assignment_type').notNull().$type<'employee' | 'contact'>(),
		role: text('role').notNull().$type<'manager' | 'analyst' | 'specialist' | 'contact'>(),
		assignedDate: text('assigned_date')
			.notNull()
			.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
		isActive: integer('is_active', { mode: 'boolean' }).default(true),
	},
	(t) => [primaryKey({ columns: [t.campaignId, t.employeeEntityId, t.role] })]
);

export const conversations = sqliteTable('conversations', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	externalId: text('external_id').notNull().unique(),
	subject: text('subject').notNull(),
	preview: text('preview'),
	started: text('started').notNull(),
	updated: text('updated').notNull(),
	count: integer('count').notNull(),
	status: text('status').notNull(),
	source: text('source').$type<
		| 'partner_external_email'
		| 'partner_app_campaign_details_goals'
		| 'partner_app_campaign_details_scope'
		| 'partner_app_campaign_details_rules'
		| 'partner_app_campaign_details_access_info'
		| 'partner_app_campaign_details_permission'
		| 'partner_app_campaign_conversations'
		| 'partner_app_conversations'
		| 'team_app_partner_header'
		| 'team_app_partner_contact'
		| 'team_app_campaign_header'
		| 'team_app_campaign_contact'
		| 'approval_request_created'
		| 'automated_notification'
	>(),
});

// Universal notes system
export const notes = sqliteTable('notes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	entityId: integer('entity_id'),
	entityType: text('entity_type').$type<
		| 'partner'
		| 'campaign'
		| 'employee'
		| 'individual'
		| 'action_item'
		| 'action_item_template'
		| 'packages'
		| 'campaign_profile'
		| 'task'
	>(),
	noteType: text('note_type')
		.notNull()
		.default('general')
		.$type<
			| 'context'
			| 'general'
			| 'access'
			| 'permissions'
			| 'feedback'
			| 'rule'
			| 'process'
			| 'template'
			| 'onboarding'
			| 'discovery'
			| 'reporting'
			| 'publishing'
		>(),
	title: text('title'),
	content: text('content'),
	isInternal: integer('is_internal', { mode: 'boolean' }).notNull().default(true),
	isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
	isCurrent: integer('is_current', { mode: 'boolean' }).notNull().default(true),
	versionNumber: integer('version_number').notNull().default(1),
	replacesNoteId: integer('replaces_note_id').references((): AnySQLiteColumn => notes.id),
	createdByEntityId: integer('created_by_entity_id').references(() => entities.id),
	conversationId: integer('conversation_id').references(() => conversations.id),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
});

// Discovery requests
export const discoveryRequests = sqliteTable('discovery_requests', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	campaignId: integer('campaign_id')
		.notNull()
		.references(() => campaigns.id),
	partnerEntityId: integer('partner_entity_id')
		.notNull()
		.references(() => entities.id),
	formResponses: text('form_responses'), // JSON
	status: text('status').notNull().default('active').$type<DiscoveryStatuses>(),
	submittedByEntityId: integer('submitted_by_entity_id').references(() => entities.id),
	reviewedByEntityId: integer('reviewed_by_entity_id').references(() => entities.id),
	submittedAt: text('submitted_at'),
	reviewedAt: text('reviewed_at'),
	// New fields from migration 0030
	websiteToAudit: text('website_to_audit'),
	salesCycle: text('sales_cycle'),
	needBy: text('need_by'),
	currency: text('currency'),
	budgetMinCents: integer('budget_min_cents'),
	budgetMaxCents: integer('budget_max_cents'),
	includeProposal: integer('include_proposal', { mode: 'boolean' }).default(true),
	priorityAreas: text('priority_areas'),
	priorityGeos: text('priority_geos'),
	termsKeywords: text('terms_keywords'),
	otherContext: text('other_context'),
	businessName: text('business_name'),
	campaignProfileId: integer('campaign_profile_id').references(() => campaignProfiles.id),
	internalDueBy: text('internal_due_by'),
	deliveredAt: text('delivered_at'),
	deliverableUrl: text('deliverable_url'),
	keywordOpportunities: text('keyword_opportunities'), // JSON
	internalSeoAudit: text('internal_seo_audit'), // JSON
	competitiveReview: text('competitive_review'), // JSON
	topKeywords: text('top_keywords'), // JSON
	topPages: text('top_pages'), // JSON
	shareToken: text('share_token'),
	shareUuid: text('share_uuid'),
	pageSpeedData: text('page_speed_data'), // JSON
	summaryScoring: text('summary_scoring'),
	keyTakeaways: text('key_takeaways'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
});

// Web crawl data table for discovery requests
export const wbCrawlData = sqliteTable('wb_crawl_data', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	campaignId: integer('campaign_id').references(() => campaigns.id),
	discoveryRequestId: integer('discovery_request_id').references(() => discoveryRequests.id),
	website: text('website').notNull(),
	startingUrl: text('starting_url'),
	crawlJobId: text('crawl_job_id'),
	jsonCrawlData: text('json_crawl_data'), // JSON
	googleSheetId: text('google_sheet_id'),
	updatedAt: text('updated_at'),
	crawlMethod: text('crawl_method').notNull().$type<'upload' | 'crawler'>(),
	crawlSource: text('crawl_source').notNull().$type<'sitebulb' | 'screamingfrog'>(),
});

// Web crawled pages table for individual page data from crawls
export const wbCrawledPages = sqliteTable('wb_crawled_pages', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	wbCrawlDataId: integer('wb_crawl_data_id')
		.notNull()
		.references(() => wbCrawlData.id, { onDelete: 'cascade' }),
	initialCrawlOrder: integer('initial_crawl_order'),
	url: text('url'),
	urlRank: text('url_rank'),
	scheme: text('scheme'),
	httpStatusCode: text('http_status_code'),
	httpStatus: text('http_status'),
	contentType: text('content_type'),
	title: text('title'),
	titleLength: text('title_length'),
	noTitles: integer('no_titles'),
	metaDescription: text('meta_description'),
	metaDescriptionLength: text('meta_description_length'),
	noMetaDescriptions: integer('no_meta_descriptions'),
	h1: text('h1'),
	h1Length: text('h1_length'),
	noH1s: integer('no_h1s'),
	noContentWords: integer('no_content_words'),
	noTemplateWords: integer('no_template_words'),
	noWords: integer('no_words'),
	noInternalLinkingUrls: integer('no_internal_linking_urls'),
	indexableStatus: text('indexable_status'),
	crawlDepth: text('crawl_depth'),
	crawlSource: text('crawl_source'),
	urlSource: text('url_source'),
	firstParentUrl: text('first_parent_url'),
});

// Conversation relationships
export const conversationCampaigns = sqliteTable(
	'conversation_campaigns',
	{
		conversationId: integer('conversation_id')
			.notNull()
			.references(() => conversations.id, { onDelete: 'cascade' }),
		campaignId: integer('campaign_id')
			.notNull()
			.references(() => campaigns.id, { onDelete: 'cascade' }),
	},
	(t) => [primaryKey({ columns: [t.conversationId, t.campaignId] })]
);

export const conversationPartners = sqliteTable(
	'conversation_partners',
	{
		conversationId: integer('conversation_id')
			.notNull()
			.references(() => conversations.id, { onDelete: 'cascade' }),
		partnerEntityId: integer('partner_entity_id')
			.notNull()
			.references(() => entities.id, { onDelete: 'cascade' }),
	},
	(t) => [primaryKey({ columns: [t.conversationId, t.partnerEntityId] })]
);

export const conversationCampaignPlans = sqliteTable(
	'conversation_campaign_plans',
	{
		conversationId: integer('conversation_id')
			.notNull()
			.references(() => conversations.id, { onDelete: 'cascade' }),
		campaignPlanId: integer('campaign_plan_id')
			.notNull()
			.references(() => campaignPlans.id, { onDelete: 'cascade' }),
	},
	(t) => [primaryKey({ columns: [t.conversationId, t.campaignPlanId] })]
);

/**
 * Type definition for discovery request records
 */
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type DiscoveryRequest = typeof discoveryRequests.$inferSelect;
export type NewDiscoveryRequest = typeof discoveryRequests.$inferInsert;

export type WbCrawlData = typeof wbCrawlData.$inferSelect;
export type NewWbCrawlData = typeof wbCrawlData.$inferInsert;

export type WbCrawledPages = typeof wbCrawledPages.$inferSelect;
export type NewWbCrawledPages = typeof wbCrawledPages.$inferInsert;

export type CrawlSource = 'sitebulb' | 'screamingfrog';
export type CrawlMethod = 'upload' | 'crawler';

export type Partner = typeof partners.$inferSelect;
export type NewPartner = typeof partners.$inferInsert;

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

export type CampaignPlan = typeof campaignPlans.$inferSelect;
export type NewCampaignPlan = typeof campaignPlans.$inferInsert;

export type Individual = typeof individuals.$inferSelect;
export type NewIndividual = typeof individuals.$inferInsert;

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

// Link plan items for campaign link building management
export const linkPlanItems = sqliteTable('link_plan_items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	plannedMonth: text('planned_month').notNull(), // Date format YYYY-MM-DD
	linkPairs: text('link_pairs'), // JSON array of {url: string, anchor: string} pairs
	status: text('status')
		.notNull()
		.default('draft')
		.$type<'draft' | 'planned' | 'submitted' | 'published'>(),
	linkSource: text('link_source').$type<'internal' | 'external'>(),
	campaignId: integer('campaign_id')
		.notNull()
		.references(() => campaigns.id, { onDelete: 'cascade' }),
	campaignPlanId: integer('campaign_plan_id')
		.references(() => campaignPlans.id),
	serviceCategoryId: integer('service_category_id')
		.references(() => serviceCategories.id),
	actionLabelId: integer('action_label_id')
		.references(() => actionLabels.id),
	workbenchTaskId: text('workbench_task_id'), // External reference to workbench system
	publishedDate: text('published_date'), // ISO datetime
	publishedUrl: text('published_url'),
	publishedUrlDa: integer('published_url_da'),
	publishedUrlDr: integer('published_url_dr'),
	publishedUrlTraffic: integer('published_url_traffic'),
	execlinksPostUuid: text('execlinks_post_uuid'),
});

export type LinkPlanItem = typeof linkPlanItems.$inferSelect;
export type NewLinkPlanItem = typeof linkPlanItems.$inferInsert;

// Content plan items for campaign content planning management
export const contentPlanItems = sqliteTable('content_plan_items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	responsibleParty: text('responsible_party'), // 'internal' | 'external'
	plannedMonth: text('planned_month').notNull(), // Date format YYYY-MM-DD
	contentType: text('content_type'), // 'Geo Page' | 'Service Page' | 'Blog Post'
	status: text('status').notNull().default('planned'), // No enum constraint - handled in code
	primaryKeyword: text('primary_keyword'),
	supportingKeywords: text('supporting_keywords'),
	searchVolume: integer('search_volume'),
	trackPrimaryKw: integer('track_primary_kw', { mode: 'boolean' }).notNull().default(false),
	recommendedTitle: text('recommended_title'),
	contentItemNotes: text('content_item_notes'),
	recommendedUrl: text('recommended_url'),
	editorEntityId: integer('editor_entity_id').references(() => entities.id),
	publishedDate: text('published_date'), // ISO datetime
	contentIdeaId: integer('content_idea_id'), // ID from secondary tool
	contentAssetId: integer('content_asset_id'), // ID from secondary tool
	contentAssetUrl: text('content_asset_url'), // URL from secondary tool
	campaignId: integer('campaign_id')
		.notNull()
		.references(() => campaigns.id, { onDelete: 'cascade' }),
	campaignPlanId: integer('campaign_plan_id')
		.references(() => campaignPlans.id),
	serviceCategoryId: integer('service_category_id')
		.references(() => serviceCategories.id),
	actionLabelId: integer('action_label_id')
		.references(() => actionLabels.id),
	workbenchTaskId: text('workbench_task_id'), // External reference to workbench system
});

export type ContentPlanItem = typeof contentPlanItems.$inferSelect;
export type NewContentPlanItem = typeof contentPlanItems.$inferInsert;

// SEO plan items for managing campaign SEO action items
export const seoPlanItems = sqliteTable('seo_plan_items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	campaignPlanId: integer('campaign_plan_id')
		.notNull()
		.references(() => campaignPlans.id),
	serviceCategoryId: integer('service_category_id')
		.references(() => serviceCategories.id),
	actionLabelId: integer('action_label_id')
		.references(() => actionLabels.id),
	status: text('status')
		.notNull()
		.default('proposed')
		.$type<'proposed' | 'planned' | 'in_progress' | 'completed'>(),
	completionDate: text('completion_date'), // strftime format
	title: text('title').notNull(),
	publicDescription: text('public_description'),
	internalDescription: text('internal_description'),
	type: text('type')
		.notNull()
		.default('custom')
		.$type<'template' | 'custom'>(),
	actionItemTemplateId: integer('action_item_template_id'), // Will reference action_item_templates.id when created
	source: text('source')
		.notNull()
		.default('internal')
		.$type<'partner' | 'client' | 'internal'>(),
	deliveryUrl: text('delivery_url'),
	deliverySummary: text('delivery_summary'),
	workbenchTaskId: text('workbench_task_id'), // External reference to workbench system
});

export type SeoPlanItem = typeof seoPlanItems.$inferSelect;
export type NewSeoPlanItem = typeof seoPlanItems.$inferInsert;

// Campaign profiles for service templates
export const campaignProfiles = sqliteTable('campaign_profiles', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	name: text('name').notNull(),
	label: text('label'),
	shortDescription: text('short_description'),
	longDescription: text('long_description'),
	criteria: text('criteria'),
	examples: text('examples'),
	seoGrowthOpportunities: text('seo_growth_opportunities'),
	commonChallenges: text('common_challenges'),
	campaignConsiderations: text('campaign_considerations'),
	presaleConsiderations: text('presale_considerations'),
	phaseOneOutline: text('phase_one_outline'),
	ongoingPhaseOutline: text('ongoing_phase_outline'),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

// Standard Operating Procedures
export const sops = sqliteTable('sops', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	type: text('type').$type<'playbook' | 'process' | 'how_to'>(),
	category: text('category').$type<
		| 'tools_and_training'
		| 'access'
		| 'client_site'
		| 'administrative'
		| 'operational'
		| 'link_building'
		| 'content_creation'
		| 'campaign_reviews'
		| 'technical_seo'
		| 'local_seo'
		| 'onboarding'
		| 'reporting'
		| 'communication'
		| 'sales_marketing'
		| 'communication_customer_service'
	>(),
	labels: text('labels'),
	title: text('title').notNull(),
	bodyHtml: text('body_html'),
	bodyMarkdown: text('body_markdown'),
	contentVersion: integer('content_version').notNull().default(1),
	relatedPartnerEntity: integer('related_partner_entity').references(() => entities.id),
	relatedDepartmentId: integer('related_department_id').references(() => departments.id),
	relatedServiceItemId: integer('related_service_item_id').references(() => serviceItems.id),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

// SOP versions for revision tracking
export const sopVersions = sqliteTable('sop_versions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	sopId: integer('sop_id')
		.notNull()
		.references(() => sops.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	bodyHtml: text('body_html'),
	wordCount: integer('word_count'),
	contentVersion: integer('content_version').notNull(),
});

// Service items catalog
export const serviceItems = sqliteTable('service_items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	name: text('name').notNull(),
	serviceCategory: text('service_category'), // Legacy field - will be replaced by service_category_id
	serviceLabel: text('service_label'), // Free-form text label added at creation time
	type: text('type').$type<'ongoing' | 'one_time'>(),
	description: text('description'),
	sopId: integer('sop_id').references(() => sops.id, { onDelete: 'set null' }),
	sopUrl: text('sop_url'),
	minPricingUsdCents: integer('min_pricing_usd_cents'),
	estCogsUsdCents: integer('est_cogs_usd_cents'),
	estTimeMinutes: integer('est_time_minutes'),
	recommendedPriceCents: integer('recommended_price_cents'),
	recommendedPriceCurrency: text('recommended_price_currency'),
	partnerEntityId: integer('partner_entity_id').references(() => entities.id),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	// New fields from migration 0043
	serviceScope: text('service_scope')
		.notNull()
		.default('campaign')
		.$type<'campaign' | 'partner' | 'internal'>(),
	isBillable: integer('is_billable', { mode: 'boolean' }).notNull().default(true),
	outcomeType: text('outcome_type').$type<'deliverable' | 'process'>(),
	showWork: integer('show_work', { mode: 'boolean' }).notNull().default(false),
	workProofType: text('work_proof_type').$type<
		| 'published_asset'
		| 'google_sheet'
		| 'plan_update'
		| 'summary_notes'
		| 'performance_report'
		| 'third_party_report'
	>(),
	workProofExample: text('work_proof_example'), // URL
	proposalMode: text('proposal_mode')
		.notNull()
		.default('both')
		.$type<'recurring' | 'one_time' | 'both' | 'neither'>(),
	uom: text('uom').$type<'page' | 'blog_post' | 'guest_post' | 'referring_domain' | 'hour' | 'cycle' | 'outcome'>(), // unit of measure
	serviceTrainer: integer('service_trainer').references(() => entities.id), // Reference to employee entity
	packageDisplay: text('package_display'), // Template text like "{proposal_quantity} Blog Post(s) Created and Published per {per_proposal_frequency}"
	mcpDisplay: text('mcp_display'), // Template text for monthly campaign plan like "{quantity} blog post(s) created and published {per_frequency}."
	serviceCategoryId: integer('service_category_id').references(() => serviceCategories.id), // Reference to service_categories table
	inStream: integer('in_stream', { mode: 'boolean' }).notNull().default(false),
	generateTask: integer('generate_task', { mode: 'boolean' }).notNull().default(false),
});

// Campaign service assignments
export const campaignServiceItems = sqliteTable('campaign_service_items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	status: text('status'),
	serviceProposedStartTime: text('service_proposed_start_time'),
	serviceStartTime: text('service_start_time'),
	serviceProposedEndTime: text('service_proposed_end_time'),
	serviceEndTime: text('service_end_time'),
	campaignId: integer('campaign_id')
		.notNull()
		.references(() => campaigns.id, { onDelete: 'cascade' }),
	serviceItemId: integer('service_item_id')
		.notNull()
		.references(() => serviceItems.id),
	quantity: integer('quantity'),
	frequency: text('frequency'),
	monthlyValueCents: integer('monthly_value_cents'),
	responsibleEntityId: integer('responsible_entity_id').references(() => entities.id),
	responsibleDepartmentId: integer('responsible_department_id').references(() => departments.id),
	displayOrder: integer('display_order'),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

// Service packages
export const packages = sqliteTable('packages', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	name: text('name').notNull(),
	monthlyPriceCents: integer('monthly_price_cents'),
	currency: text('currency'),
	partnerEntityId: integer('partner_entity_id').references(() => entities.id),
	relatedCampaignProfileId: integer('related_campaign_profile_id').references(
		() => campaignProfiles.id
	),
	campaignConsiderations: text('campaign_considerations'),
	presaleConsiderations: text('presale_considerations'),
	phaseOneOutline: text('phase_one_outline'),
	ongoingPhaseOutline: text('ongoing_phase_outline'),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	buyWithoutDiscovery: integer('buy_without_discovery', { mode: 'boolean' })
		.notNull()
		.default(true),
	description: text('description'),
	outcome: text('outcome'),
	seoGrowthOpportunities: text('seo_growth_opportunities'),
	type: text('type').$type<'ongoing' | 'one_time'>(),
	defaultAaClientTemplate: text('default_aa_client_template'),
});

// Package service item relationships
export const packageServiceItems = sqliteTable('package_service_items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	packageId: integer('package_id')
		.notNull()
		.references(() => packages.id, { onDelete: 'cascade' }),
	serviceItemId: integer('service_item_id')
		.notNull()
		.references(() => serviceItems.id),
	quantity: integer('quantity'),
	frequency: text('frequency'),
	monthlyPriceCents: integer('monthly_price_cents'),
	orderOverride: integer('order_override'),
	uniqueServiceLabel: text('unique_service_label'),
});

// Package service action items for linking action item templates to packages
export const packageServiceActionItems = sqliteTable('package_service_action_items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	packageId: integer('package_id')
		.notNull()
		.references(() => packages.id, { onDelete: 'cascade' }),
	packageServiceItemId: integer('package_service_item_id').references(
		() => packageServiceItems.id,
		{ onDelete: 'cascade' }
	),
	serviceItemId: integer('service_item_id')
		.notNull()
		.references(() => serviceItems.id),
	orderOverride: integer('order_override'),
	inOnboarding: integer('in_onboarding', { mode: 'boolean' }).default(false),
});



export type CampaignProfile = typeof campaignProfiles.$inferSelect;
export type NewCampaignProfile = typeof campaignProfiles.$inferInsert;

export type Sop = typeof sops.$inferSelect;
export type NewSop = typeof sops.$inferInsert;

export type ServiceItem = typeof serviceItems.$inferSelect;
export type NewServiceItem = typeof serviceItems.$inferInsert;

export type CampaignServiceItem = typeof campaignServiceItems.$inferSelect;
export type NewCampaignServiceItem = typeof campaignServiceItems.$inferInsert;

export type Package = typeof packages.$inferSelect;
export type NewPackage = typeof packages.$inferInsert;

export type PackageServiceItem = typeof packageServiceItems.$inferSelect;
export type NewPackageServiceItem = typeof packageServiceItems.$inferInsert;

export type PackageServiceActionItem = typeof packageServiceActionItems.$inferSelect;
export type NewPackageServiceActionItem = typeof packageServiceActionItems.$inferInsert;

// Brand details for entity-specific branding
export const brandDetails = sqliteTable('brand_details', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	entityId: integer('entity_id')
		.notNull()
		.references(() => entities.id),
	logoDefault: text('logo_default'),
	logoLightBg: text('logo_light_bg'),
	logoDarkBg: text('logo_dark_bg'),
	headerFont: text('header_font'),
	bodyFont: text('body_font'),
	primaryColor: text('primary_color'),
	secondaryColor: text('secondary_color'),
});

export type BrandDetails = typeof brandDetails.$inferSelect;
export type NewBrandDetails = typeof brandDetails.$inferInsert;


// Billing agreements
export const billingAgreements = sqliteTable('billing_agreements', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	status: text('status')
		.notNull()
		.$type<'active' | 'scheduled' | 'paused' | 'ended' | 'cancelled' | 'proposed' | 'rejected'>(),
	plannedStartDate: text('planned_start_date'),
	plannedEndDate: text('planned_end_date'),
	startDate: text('start_date'),
	endDate: text('end_date'),
	predecessorAgreementId: integer('predecessor_agreement_id').references(
		(): AnySQLiteColumn => billingAgreements.id
	),
	sourcePackageId: integer('source_package_id').references(() => packages.id),
	sourceProposalId: integer('source_proposal_id'),
	campaignId: integer('campaign_id').references(() => campaigns.id),
	partnerId: integer('partner_id')
		.notNull()
		.references(() => entities.id),
	currency: text('currency'),
	paymentMethod: text('payment_method'),
	paymentTermsDays: integer('payment_terms_days'),
	recurrenceRuleJson: text('recurrence_rule_json').notNull(),
	prorationPolicy: text('proration_policy').notNull(),
	invoiceGroupingKey: text('invoice_grouping_key'),
	nextInvoiceDate: text('next_invoice_date'),
	lastInvoicedThrough: text('last_invoiced_through'),
	versapayCustomerId: text('versapay_customer_id'),
	stripeCustomerId: text('stripe_customer_id'),
	autoPayEnabled: integer('auto_pay_enabled', { mode: 'boolean' }).default(false),
	revision: integer('revision').default(1),
	discoveryRequestId: integer('discovery_request_id').references(() => discoveryRequests.id),
	proposalName: text('proposal_name'),
	paymentAmount: integer('payment_amount'),
	proposalPresaleCampaignConsiderations: text('proposal_presale_campaign_considerations'),
	proposalSeoGrowthOpportunities: text('proposal_seo_growth_opportunities'),
	proposalCampaignExpectations: text('proposal_campaign_expectations'),
	proposalType: text('proposal_type').$type<'one_time' | 'ongoing'>(),
	partnerMarkupPrice: integer('partner_markup_price'),
});

// Agreement service item relationships
export const agreementServiceItems = sqliteTable('agreement_service_items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	billingAgreementId: integer('billing_agreement_id')
		.notNull()
		.references(() => billingAgreements.id, { onDelete: 'cascade' }),
	serviceItemId: integer('service_item_id')
		.notNull()
		.references(() => serviceItems.id),
	customName: text('custom_name'),
	customDescription: text('custom_description'),
	quantity: integer('quantity'),
	frequency: text('frequency'),
	monthlyPriceCents: integer('monthly_price_cents'),
	uniqueServiceLabel: text('unique_service_label'),
	orderOverride: integer('order_override'),
});

// Agreement service action items
export const agreementServiceActionItems = sqliteTable('agreement_service_action_items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	billingAgreementId: integer('billing_agreement_id')
		.notNull()
		.references(() => billingAgreements.id, { onDelete: 'cascade' }),
	agreementServiceItemId: integer('agreement_service_item_id')
		.references(() => agreementServiceItems.id, { onDelete: 'cascade' }),
	serviceItemId: integer('service_item_id')
		.notNull()
		.references(() => serviceItems.id),
	orderOverride: integer('order_override'),
	customTitle: text('custom_title'),
	customDescription: text('custom_description'),
	inOnboarding: integer('in_onboarding', { mode: 'boolean' }).default(false),
});

export type BillingAgreement = typeof billingAgreements.$inferSelect;
export type NewBillingAgreement = typeof billingAgreements.$inferInsert;

export type AgreementServiceItem = typeof agreementServiceItems.$inferSelect;
export type NewAgreementServiceItem = typeof agreementServiceItems.$inferInsert;

export type AgreementServiceActionItem = typeof agreementServiceActionItems.$inferSelect;
export type NewAgreementServiceActionItem = typeof agreementServiceActionItems.$inferInsert;

// Action item templates for reusable task definitions
export const actionItemTemplates = sqliteTable('action_item_templates', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	templateName: text('template_name'),
	title: text('title'),
	description: text('description'),
	status: text('status'),
	itemPriority: text('item_priority'),
	timeEstimate: integer('time_estimate'), // minutes
	checklistItems: text('checklist_items'), // JSON array: ChecklistItem[]
	relatedUrls: text('related_urls'),
	deliverableUrl: text('deliverable_url'),
	type: text('type').$type<
		| 'campaign_onboarding'
		| 'partner_onboarding'
		| 'campaign_task'
		| 'partner_task'
		| 'customer_service'
		| 'operations'
		| 'administration'
		| 'support'
		| 'discovery'
	>(),
	serviceCategory: text('service_category').$type<
		| 'link_building'
		| 'content_creation'
		| 'specialist_time'
		| 'campaign_review'
		| 'strategist_time'
		| 'reporting'
		| 'gbp'
		| 'support'
		| 'non_billable'
	>(),
	isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
	recurBy: text('recur_by'), // 'day', 'week', 'month'
	recurInterval: integer('recur_interval'),
	recurDaysOfWeek: text('recur_days_of_week'), // JSON array
	recurDaysOfMonth: text('recur_days_of_month'), // JSON array
	maxOccurrences: integer('max_occurrences'),
	relatedScopeItemId: integer('related_scope_item_id').references(() => campaignServiceItems.id),
	partnerEntityId: integer('partner_entity_id').references(() => entities.id),
	relatedCampaignProfile: integer('related_campaign_profile').references(() => campaignProfiles.id),
	actionSopId: integer('action_sop_id').references(() => sops.id),
	assignedEmployeeId: integer('assigned_employee_id').references(() => entities.id),
	displayOrder: integer('display_order'),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

// Action items for actual task instances
export const actionItems = sqliteTable('action_items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	plannedMonth: text('planned_month'),
	planPriorityOrder: integer('plan_priority_order'),
	relatedScopeItem: integer('related_scope_item').references(() => campaignServiceItems.id),
	type: text('type'), // onboarding, campaign_task, customer_service, operations, administration, support
	serviceCategory: text('service_category'), // link_building, content_creation, specialist_time, reporting, campaign_review
	status: text('status'), // planned, in_progress, requires_feedback, blocked, complete
	plannedStartDate: text('planned_start_date'),
	plannedDueDate: text('planned_due_date'),
	itemStarted: text('item_started'),
	itemCompleted: text('item_completed'),
	isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
	recurBy: text('recur_by'), // 'day', 'week', 'month'
	recurInterval: integer('recur_interval'),
	recurDaysOfWeek: text('recur_days_of_week'), // JSON array
	recurDaysOfMonth: text('recur_days_of_month'), // JSON array
	lastRecurrenceStart: text('last_recurrence_start'),
	nextRecurrenceStart: text('next_recurrence_start'),
	maxOccurrences: integer('max_occurrences'),
	recurrenceEndDate: text('recurrence_end_date'),
	recurrenceCount: integer('recurrence_count'),
	title: text('title'),
	description: text('description'),
	planDetails: text('plan_details'),
	planSource: text('plan_source'),
	completionNotes: text('completion_notes'),
	itemPriority: text('item_priority'),
	relatedUrls: text('related_urls'),
	deliverableUrl: text('deliverable_url'),
	checklistItems: text('checklist_items'), // JSON array: ChecklistItem[]
	timeEstimate: integer('time_estimate'), // minutes
	totalTimeTracked: integer('total_time_tracked'), // minutes
	assignedEmployeeId: integer('assigned_employee_id').references(() => entities.id),
	actionSopId: integer('action_sop_id').references(() => sops.id),
	sourceTemplateId: integer('source_template_id').references(() => actionItemTemplates.id),
	entityType: text('entity_type'), // partner, campaign, department
	entityId: integer('entity_id'),
});

// Time entries for tracking work
export const timeEntries = sqliteTable('time_entries', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	timeEntryDate: text('time_entry_date').$type<`${number}-${number}-${number}`>(), // YYYY-MM-DD format
	timeEntryAmount: integer('time_entry_amount'), // minutes
	notes: text('notes'),
	entityType: text('entity_type').$type<
		| 'action_items'
		| 'partners'
		| 'campaigns'
		| 'employees'
		| 'discovery_requests'
		| 'scope_items'
		| 'packages'
	>(),
	entityId: integer('entity_id'),
});

export type ActionItemTemplate = typeof actionItemTemplates.$inferSelect;
export type NewActionItemTemplate = typeof actionItemTemplates.$inferInsert;

export type ActionItem = typeof actionItems.$inferSelect;
export type NewActionItem = typeof actionItems.$inferInsert;

// Checklist item type for JSON storage
export type ChecklistItem = {
	id: string;
	name: string;
	description?: string;
	completed: boolean;
	order: number;
};

export const activities = sqliteTable('activities', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull(),
	partnerId: integer('partner_id').references(() => partners.entityId),
	activityType: text('activity_type').notNull().$type<ActivityType>(),
	relatedId: integer('related_id').notNull(),
	relatedTable: text('related_table').notNull().$type<RelatedTable>(),
	details: text('details'),
	activityDate: text('activity_date').notNull(),
});

export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;

// GBP locations for business listing management
export const gbpLocations = sqliteTable('gbp_locations', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	placesId: text('places_id'),
	businessName: text('business_name'),
	businessAddress: text('business_address'),
	businessPhone: text('business_phone'),
	landingPageUrl: text('landing_page_url'),
	category: text('category'), // 'campaign', 'campaign_competitor', etc.
	campaignEntityId: integer('campaign_entity_id').references(() => campaigns.id),
	relatedActionItemId: integer('related_action_item_id').references(() => actionItems.id),
	relatedDiscoveryRequestID: integer('related_discovery_request_id').references(() => discoveryRequests.id),
});

// API responses for logging external service calls
export const apiResponses = sqliteTable('api_responses', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	apiSource: text('api_source'), // 'site_crawl', 'ahrefs', 'moz', etc.
	category: text('category'), // 'crawl_data', 'page_speed_score', etc.
	label: text('label'),
	endpointUrl: text('endpoint_url'),
	endpointName: text('endpoint_name'),
	apiEndpointDocumentationUrl: text('api_endpoint_documentation_url'),
	requestParameters: text('request_parameters'), // JSON as text
	requestStatusCode: integer('request_status_code'),
	responseData: text('response_data'), // JSON as text
	campaignId: integer('campaign_id').references(() => campaigns.id),
	actionItemId: integer('action_item_id').references(() => actionItems.id),
	gbpLocationId: integer('gbp_location_id').references(() => gbpLocations.id),
});

// GBP post items for managing Google Business Profile posts
export const gbpPostItems = sqliteTable('gbp_post_items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	plannedMonth: text('planned_month'),
	postType: text('post_type'),
	status: text('status'),
	postTitle: text('post_title'),
	postBody: text('post_body'),
	ctaType: text('cta_type'),
	mediaUrl: text('media_url'),
	mediaType: text('media_type'),
	publishDate: text('publish_date'), // ISO datetime
	externalGbpPostId: integer('external_gbp_post_id'),
	campaignId: integer('campaign_id').references(() => campaigns.id),
	campaignPlanId: integer('campaign_plan_id')
		.references(() => campaignPlans.id),
	serviceCategoryId: integer('service_category_id')
		.references(() => serviceCategories.id),
	actionLabelId: integer('action_label_id')
		.references(() => actionLabels.id),
	workbenchTaskId: text('workbench_task_id'), // External reference to workbench system
	gbpLocationId: integer('gbp_location_id').references(() => gbpLocations.id),
});

export type GbpLocation = typeof gbpLocations.$inferSelect;
export type NewGbpLocation = typeof gbpLocations.$inferInsert;

export type ApiResponse = typeof apiResponses.$inferSelect;
export type NewApiResponse = typeof apiResponses.$inferInsert;

export type GbpPostItem = typeof gbpPostItems.$inferSelect;
export type NewGbpPostItem = typeof gbpPostItems.$inferInsert;

// GBP location ranking scans for storing ranking data from external sources
export const gbpLocationRankingScans = sqliteTable('gbp_location_ranking_scans', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	gbpLocationId: integer('gbp_location_id')
		.notNull()
		.references(() => gbpLocations.id, { onDelete: 'cascade' }),
	externalSource: text('external_source')
		.notNull()
		.$type<'localfalcon' | 'localbrandmanager' | 'brightlocal'>(),
	externalScanId: text('external_scan_id'), // ID of the associated scan in the third party tool
	gbpLandingPage: text('gbp_landing_page'), // URL
	gridRankingImage: text('grid_ranking_image'), // URL
	solv: integer('solv', { mode: 'number' }), // Share of local voice (float)
	atrp: integer('atrp', { mode: 'number' }), // Average tracking ranking position (float)
	arp: integer('arp', { mode: 'number' }), // Average ranking position (float)
	aiReportSummary: text('ai_report_summary'),
	aiReportRecommendations: text('ai_report_recommendations'), // JSON with priority, description, status
});

export type GbpLocationRankingScan = typeof gbpLocationRankingScans.$inferSelect;
export type NewGbpLocationRankingScan = typeof gbpLocationRankingScans.$inferInsert;

// Discovery competitive reviews for managing competitive analysis and discovery audits
export const discoveryCompetitiveReviews = sqliteTable('discovery_competitive_reviews', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	discoveryRequestId: integer('discovery_request_id').references(() => discoveryRequests.id),
	title: text('title'),
	type: text('type'),
	notes: text('notes'),
	summary: text('summary'), // JSON data
	expiresAt: text('expires_at'),
});

// Discovery audits linked to competitive reviews
export const discoveryAudits = sqliteTable('discovery_audits', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	discoveryRequestId: integer('discovery_request_id').references(() => discoveryRequests.id),
	competitiveReviewId: integer('competitive_review_id')
		.references(() => discoveryCompetitiveReviews.id, { onDelete: 'cascade' }),
	status: text('status'),
	role: text('role').$type<'client' | 'competitor'>(),
	websiteUrl: text('website_url'),
	googlePlacesId: text('google_places_id'),
	rootDomain: text('root_domain'),
	brandName: text('brand_name'),
	gbpLandingPage: text('gbp_landing_page'),
	notes: text('notes'),
	expiresAt: text('expires_at'),
});

// Discovery audited elements for storing audit results and measurements
export const discoveryAuditedElements = sqliteTable('discovery_audited_elements', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	discoveryAuditId: integer('discovery_audit_id')
		.notNull()
		.references(() => discoveryAudits.id, { onDelete: 'cascade' }),
	auditElementTitle: text('audit_element_title'),
	auditElementDescription: text('audit_element_description'),
	auditElementCategory: text('audit_element_category'),
	auditElementLabel: text('audit_element_label'),
	toolReference: text('tool_reference'),
	externalToolId: text('external_tool_id'),
	elementResultFormat: text('element_result_format').$type<'int' | 'decimal' | 'text' | 'bool'>(),
	elementResultInt: integer('element_result_int'),
	elementResultText: text('element_result_text'),
	elementResultDecimal: integer('element_result_decimal', { mode: 'number' }),
	resultPriority: text('result_priority'),
	resultInsights: text('result_insights'),
	resultSupportingUrl: text('result_supporting_url'),
	includeInCompetitive: integer('include_in_competitive', { mode: 'boolean' }).notNull().default(false), // Whether to include this element in competitive matrix review
}, (table) => ({
	// Unique constraint to prevent duplicate audit elements
	uniqueAuditElementLabel: unique().on(table.discoveryAuditId, table.auditElementLabel)
}));

export type DiscoveryCompetitiveReview = typeof discoveryCompetitiveReviews.$inferSelect;
export type NewDiscoveryCompetitiveReview = typeof discoveryCompetitiveReviews.$inferInsert;

export type DiscoveryAudit = typeof discoveryAudits.$inferSelect;
export type NewDiscoveryAudit = typeof discoveryAudits.$inferInsert;

export type DiscoveryAuditedElement = typeof discoveryAuditedElements.$inferSelect;
export type NewDiscoveryAuditedElement = typeof discoveryAuditedElements.$inferInsert;

// Permissions table for storing permission gates (publish_content, install_plugin, etc.)
export const permissions = sqliteTable('permissions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	// Scope (template rows at profile/partner/package; real rows at campaign)
	campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
	packageId: integer('package_id').references(() => packages.id, { onDelete: 'cascade' }),
	partnerId: integer('partner_id').references(() => entities.id, { onDelete: 'cascade' }),
	campaignProfileId: integer('campaign_profile_id').references(() => campaignProfiles.id, { onDelete: 'cascade' }),
	serviceItemId: integer('service_item_id').references(() => serviceItems.id), // Added in migration 0043
	serviceCategoryId: integer('service_category_id').references(() => serviceCategories.id), // Added in migration 0043
	permissionKey: text('permission_key').notNull(),
	permissionState: text('permission_state')
		.notNull()
		.$type<'allowed' | 'allowed_with_approval' | 'not_allowed'>(),
	scopeStatus: text('scope_status').$type<'in_scope' | 'not_in_scope'>(),
	name: text('name'), // Added in migration 0043
	changedBy: integer('changed_by').references(() => entities.id),
	changeReason: text('change_reason'),
	isActive: integer('is_active').notNull().default(1), // Added in migration 0069
});

// Access items for storing credential and access information
export const accessItems = sqliteTable('access_items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	email: text('email'),
	username: text('username').notNull(),
	accessItemOwner: text('access_item_owner').notNull().$type<'partner' | 'internal'>(),
	inLastpass: integer('in_lastpass', { mode: 'boolean' }).notNull().default(false), // Whether stored in LastPass
	tfaType: text('tfa_type').$type<'sms' | 'email' | 'authenticator' | 'other'>(), // 2FA type
	tfaTypeValue: text('tfa_type_value'), // The email, phone number, etc. for 2FA
	tfaContactId: integer('tfa_contact_id').references(() => entities.id), // Who manages access to the 2FA
	tfaSource: text('tfa_source').$type<'internal' | 'partner'>(),
	partnerEntityId: integer('partner_entity_id').references(() => entities.id), // Link to partner entity
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), // Soft delete flag
});

// Campaign access for managing platform access permissions
export const campaignAccess = sqliteTable('campaign_access', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	type: text('type')
		.notNull()
		.$type<'partner' | 'campaign'>(), // 'partner' (template items) or 'campaign'
	status: text('status')
		.notNull()
		.default('pending')
		.$type<'pending' | 'active' | 'issue' | 'revoked'>(),
	platform: text('platform')
		.notNull()
		.$type<'gbp' | 'ga4' | 'gsc' | 'gads' | 'gtm' | 'msads' | 'mssc' | 'cms' | 'other'>(),
	name: text('name'), // Used to add a label like "WordPress" or something on top
	accessConfirmedOn: text('access_confirmed_on'), // as strftime string
	accessConfirmedBy: integer('access_confirmed_by').references(() => entities.id),
	accessItemId: integer('access_item_id')
		.notNull()
		.references(() => accessItems.id, { onDelete: 'cascade' }),
	campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }), // NULL when type='partner'
	partnerId: integer('partner_id').references(() => entities.id), // Used as template when type='partner'
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
});

// Effective permissions table - materialized effective permissions per campaign
export const effectivePermissions = sqliteTable('effective_permissions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	campaignId: integer('campaign_id')
		.notNull()
		.references(() => campaigns.id, { onDelete: 'cascade' }),
	permissionKey: text('permission_key').notNull(),
	permissionState: text('permission_state')
		.notNull()
		.$type<'allowed' | 'allowed_with_approval' | 'not_allowed'>(),
	sourceLevel: text('source_level').$type<'default' | 'partner' | 'package' | 'campaign'>(),
	sourceId: integer('source_id'), // references permissions.id
	confirmedAt: text('confirmed_at'),
	confirmedBy: integer('confirmed_by').references(() => entities.id),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
}, (table) => ({
	uniqueCampaignPermissionKey: unique().on(table.campaignId, table.permissionKey)
}));

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

export type EffectivePermission = typeof effectivePermissions.$inferSelect;
export type NewEffectivePermission = typeof effectivePermissions.$inferInsert;

export type AccessItem = typeof accessItems.$inferSelect;
export type NewAccessItem = typeof accessItems.$inferInsert;

export type CampaignAccess = typeof campaignAccess.$inferSelect;
export type NewCampaignAccess = typeof campaignAccess.$inferInsert;

// Service categories for organizing different types of services
export const serviceCategories = sqliteTable('service_categories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	key: text('key').notNull().unique(),
	displayName: text('display_name').notNull(),
	description: text('description'),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
});

// Action labels for specific actions within service categories
export const actionLabels = sqliteTable('action_labels', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	actionLabel: text('action_label').notNull().unique(),
	serviceCategoryId: integer('service_category_id')
		.notNull()
		.references(() => serviceCategories.id),
	displayName: text('display_name').notNull(),
	description: text('description'),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	version: integer('version').notNull().default(1),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
});

export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type NewServiceCategory = typeof serviceCategories.$inferInsert;

export type ActionLabel = typeof actionLabels.$inferSelect;
export type NewActionLabel = typeof actionLabels.$inferInsert;

// Rules table for campaign and partner-level rules
export const rules = sqliteTable('rules', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
	partnerEntityId: integer('partner_entity_id').references(() => entities.id, { onDelete: 'set null' }),
	ruleReason: text('rule_reason').notNull(),
	ruleValue: text('rule_value').notNull(),
	serviceCategoryId: integer('service_category_id').references(() => serviceCategories.id),
	serviceItemId: integer('service_item_id').references(() => serviceItems.id),
	referenceUrl: text('reference_url'),
	status: text('status').notNull().default('active').$type<'active' | 'archived'>(),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
});

export type Rule = typeof rules.$inferSelect;
export type NewRule = typeof rules.$inferInsert;

// Approval Requests
export const approvalRequests = sqliteTable('approval_requests', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	approvalObjectType: text('approval_object_type'), // 'campaign', 'campaign_plan', 'content_plan_item', 'link_plan_item', 'gbp_post_item', 'seo_plan_item', 'scope', 'billing_agreement'
	approvalObjectId: integer('approval_object_id'),
	reason: text('reason'), // 'onboarding', 'process_requirement', 'plan_update'
	status: text('status').notNull().$type<'pending' | 'approved' | 'rejected' | 'actioned' | 'archived'>(),
	title: text('title'),
	message: text('message'),
	approvalWorkUrl: text('approval_work_url'), // The attached URL of the work that needs to be approved when not attached to an approval_object
	approvedBy: integer('approved_by').references(() => entities.id),
	approvedAt: text('approved_at'),
	priority: text('priority').$type<'low' | 'normal' | 'high' | 'blocking'>(), // 'blocking' is used if the approval is required for us to continue working on a specific outcome of a campaign
	dueBy: text('due_by'), // Deadline for when the approval needs to be actioned
	partnerEntityId: integer('partner_entity_id').references(() => entities.id),
	campaignId: integer('campaign_id').references(() => campaigns.id),
	conversationId: integer('conversation_id').references(() => conversations.id, { onDelete: 'set null' })
});

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;

// Feedback
export const feedback = sqliteTable('feedback', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	// Made nullable - used when feedback is about a specific object (content asset, package, etc.)
	feedbackObjectType: text('feedback_object_type').$type<'campaign_scope' | 'campaign_goals' | 'campaign_rules' | 'campaign_access_logins' | 'campaign_permissions' | 'campaign' | 'partner' | 'campaign_plan' | 'content_plan_item' | 'link_plan_item' | 'seo_plan_item' | 'gbp_post_item' | 'billing_agreement' | 'billing_agreement_service_item'>(), // Specific object types for feedback
	feedbackObjectId: integer('feedback_object_id'),
	feedbackObjectVersion: integer('feedback_object_version'),
	status: text('status').notNull().$type<'pending' | 'actioned' | 'archived'>(), // 'pending', 'actioned', 'archived'
	feedbackSource: text('feedback_source').notNull(), // 'internal', 'external'
	feedbackTitle: text('feedback_title'),
	feedbackBody: text('feedback_body'),
	feedbackForUrl: text('feedback_for_url'), // Optional URL reference for feedback
	attachedContext: text('attached_context'),
	sentiment: text('sentiment'),
	priority: text('priority').$type<'low' | 'normal' | 'high' | 'blocking'>(),
	partnerEntityId: integer('partner_entity_id').references(() => entities.id),
	campaignId: integer('campaign_id').references(() => campaigns.id),
	parentFeedbackId: integer('parent_feedback_id').references(() => feedback.id)
});

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;

// Task templates for reusable task definitions
export const taskTemplates = sqliteTable('task_templates', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by').references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by').references(() => entities.id),

	// Task classification
	type: text('type').notNull().$type<
		'partner_onboarding' |
		'campaign_onboarding' |
		'campaign_task' |
		'partner_task' |
		'internal'
	>(),
	title: text('title').notNull(),
	description: text('description'),
	key: text('key'),

	// Assignment and workflow
	primaryParticipant: text('primary_participant').notNull().$type<
		'campaign_manager' |
		'account_manager' |
		'account_executive' |
		'discovery' |
		'partner' |
		'strategist' |
		'specialist' |
		'reporting_specialist'
	>(),
	grouping: text('grouping').notNull().$type<
		'co_admin' |
		'co_plans' |
		'co_reporting' |
		'co_initial_work' |
		'po_good_fit' |
		'po_expectations' |
		'po_admin' |
		'po_handoff'
	>(),
	estTimeMinutes: integer('est_time_minutes'),

	// Related resources
	sopUrl: text('sop_url'),
	sopId: integer('sop_id').references(() => sops.id),
	goldStandardUrl: text('gold_standard_url'),

	// Template configuration
	templateCategory: text('template_category').notNull().$type<
		'default' |
		'partner_specific' |
		'campaign_profile_specific' |
		'partner_campaign_profile_specific'
	>(),
	partnerEntityId: integer('partner_entity_id').references(() => entities.id),
	campaignProfileId: integer('campaign_profile_id').references(() => campaignProfiles.id),
	serviceCategoryId: integer('service_category_id').references(() => serviceCategories.id),

	// Task attributes
	mandatory: integer('mandatory', { mode: 'boolean' }).notNull().default(false),
	decisionPoint: integer('decision_point', { mode: 'boolean' }).notNull().default(false),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

// Task instances spawned from templates
export const tasks = sqliteTable('tasks', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by').references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by').references(() => entities.id),

	// Task classification and source
	type: text('type').notNull().$type<
		'partner_onboarding' |
		'campaign_onboarding' |
		'campaign_task' |
		'partner_task' |
		'internal'
	>(),
	templateId: integer('template_id').references(() => taskTemplates.id),
	serviceItemTemplateId: integer('service_item_template_id').references(() => serviceItems.id),
	campaignId: integer('campaign_id').references(() => campaigns.id),
	partnerEntityId: integer('partner_entity_id').notNull().references(() => entities.id),

	// Task details
	title: text('title').notNull(),
	description: text('description'),
	key: text('key'),

	// Assignment and workflow
	primaryParticipant: text('primary_participant').$type<
		'campaign_manager' |
		'account_manager' |
		'account_executive' |
		'discovery' |
		'partner' |
		'strategist' |
		'specialist' |
		'reporting_specialist'
	>(),
	assignedEntityId: integer('assigned_entity_id').references(() => entities.id),
	assignedEntityType: text('assigned_entity_type').$type<'employee' | 'partner_contact'>(),
	grouping: text('grouping').notNull().$type<
		'co_admin' |
		'co_plans' |
		'co_reporting' |
		'co_initial_work' |
		'po_good_fit' |
		'po_expectations' |
		'po_admin' |
		'po_handoff'
	>(),
	estTimeMinutes: integer('est_time_minutes'),

	// Related resources
	sopUrl: text('sop_url'),
	sopId: integer('sop_id').references(() => sops.id),
	goldStandardUrl: text('gold_standard_url'),
	deliverableUrl: text('deliverable_url'),

	// Task execution status
	status: text('status').notNull().$type<'todo' | 'in_progress' | 'waiting' | 'complete' | 'closed'>(),
	skipped: integer('skipped', { mode: 'boolean' }).notNull().default(false),
	mandatory: integer('mandatory', { mode: 'boolean' }).notNull().default(false),
	decisionPoint: integer('decision_point', { mode: 'boolean' }).notNull().default(false),

	// Task ordering
	relativeOrder: integer('relative_order'),

	// Completion tracking
	note: text('note'),
	completedBy: integer('completed_by').references(() => entities.id),
	completedAt: text('completed_at'),
	closedBy: integer('closed_by').references(() => entities.id),
	closedAt: text('closed_at'),
});

export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type NewTaskTemplate = typeof taskTemplates.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

// Prompt management tables
export const basePrompts = sqliteTable('base_prompts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	agentName: text('agent_name').notNull(),
	category: text('category').notNull(),
	name: text('name').notNull(),
	description: text('description'),
	currentContent: text('current_content').notNull(),
	lastSyncedAt: text('last_synced_at')
		.notNull()
		.default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
});

export const promptRevisions = sqliteTable('prompt_revisions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	basePromptId: integer('base_prompt_id')
		.notNull()
		.references(() => basePrompts.id),
	basePromptName: text('base_prompt_name').notNull(),
	revisionNumber: integer('revision_number').notNull().default(1),
	content: text('content').notNull(),
	status: text('status')
		.notNull()
		.default('pending')
		.$type<'pending' | 'in_review' | 'approved' | 'rejected' | 'deployed'>(),
	notes: text('notes'),
	testResults: text('test_results'),
	reviewedBy: integer('reviewed_by').references(() => entities.id),
	reviewedAt: text('reviewed_at'),
	deployedAt: text('deployed_at'),
});

export type BasePrompt = typeof basePrompts.$inferSelect;
export type NewBasePrompt = typeof basePrompts.$inferInsert;
export type PromptRevision = typeof promptRevisions.$inferSelect;
export type NewPromptRevision = typeof promptRevisions.$inferInsert;

// Campaign reports table
export const campaignReports = sqliteTable('campaign_reports', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	serviceType: text('service_type')
		.notNull()
		.$type<'seo' | 'ppc' | 'automation'>(),
	platform: text('platform')
		.notNull()
		.default('agency_analytics')
		.$type<'agency_analytics' | 'local_brand_manager' | 'local_falcon' | 'internal'>(),
	campaignId: integer('campaign_id')
		.notNull()
		.references(() => campaigns.id),
	title: text('title'),
	startingTemplate: text('starting_template'),
	reportStatus: text('report_status')
		.notNull()
		.default('draft')
		.$type<'draft' | 'scheduled' | 'paused' | 'cancelled'>(),
	autoReportDay: integer('auto_report_day'),
	exportReportDue: integer('export_report_due'),
	usesGtm: integer('uses_gtm', { mode: 'boolean' }).notNull().default(false),
	gtmOwner: text('gtm_owner').$type<'partner' | 'client' | 'internal'>(),
	integrations: text('integrations'), // JSON array
	includedData: text('included_data'), // JSON array
	aaCampaignId: text('aa_campaign_id'),
	campaignProfileId: integer('campaign_profile_id').references(() => campaignProfiles.id),
});

export type CampaignReport = typeof campaignReports.$inferSelect;
export type NewCampaignReport = typeof campaignReports.$inferInsert;

// Artifacts for storing campaign-related documents and resources
export const artifacts = sqliteTable('artifacts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	artifactType: text('artifact_type')
		.notNull()
		.$type<'link_url' | 'pdf' | 'json' | 'csv' | 'image' | 'html' | 'markdown'>(),
	title: text('title').notNull(),
	url: text('url').notNull(),
});

export type Artifact = typeof artifacts.$inferSelect;
export type NewArtifact = typeof artifacts.$inferInsert;

// Campaign artifacts for linking artifacts to campaigns
export const campaignArtifacts = sqliteTable('campaign_artifacts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	createdBy: integer('created_by')
		.notNull()
		.references(() => entities.id),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`strftime('%FT%H:%M:%fZ', 'now')`),
	updatedBy: integer('updated_by')
		.notNull()
		.references(() => entities.id),
	campaignId: integer('campaign_id')
		.notNull()
		.references(() => campaigns.id, { onDelete: 'cascade' }),
	artifactId: integer('artifact_id')
		.notNull()
		.references(() => artifacts.id, { onDelete: 'cascade' }),
	visibility: text('visibility')
		.notNull()
		.default('private')
		.$type<'private' | 'public'>(),
	role: text('role').$type<'report' | 'deliverable' | 'supporting'>(),
	label: text('label'), // Optional override for displayed title
	orderIndex: integer('order_index').notNull().default(1),
}, (table) => ({
	uniqueCampaignArtifact: unique().on(table.campaignId, table.artifactId),
}));

export type CampaignArtifact = typeof campaignArtifacts.$inferSelect;
export type NewCampaignArtifact = typeof campaignArtifacts.$inferInsert;

const loggableTables = [
	partners,
	individuals,
	entities,
	campaigns,
	employees,
	departments,
	discoveryRequests,
	wbCrawlData,
	conversations,
	actionItems,
	actionItemTemplates,
	tasks,
	taskTemplates,
	campaignProfiles,
	serviceItems,
	serviceCategories,
	sops,
	packages,
	billingAgreements,
] as const;

export type RelatedTable = TableNameUnion<typeof loggableTables>;
export const RELATED_TABLES: { [K in RelatedTable]: K } = loggableTables.reduce(
	(p, c) => ({ ...p, [getTableName(c)]: getTableName(c) }),
	{} as { [K in RelatedTable]: K }
);
console.log(RELATED_TABLES);
