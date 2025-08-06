import * as ReportService from './report.service.js';

export const createReportController = async (req, res) => {
    try {
        const { reportedUser, reportedPost, reason } = req.body;
        const reportedBy = req.user.id;

        if (!reason) {
            return res.status(400).json({ message: 'Report reason is required' });
        }

        // Prevent user from reporting themselves
        if (reportedBy === reportedUser) {
            return res.status(400).json({ message: 'You cannot report yourself' });
        }

        const report = await ReportService.createReport(reportedBy, reportedUser, reportedPost, reason);
        res.status(201).json({ message: 'Report submitted successfully', report });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllReportsController = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const reportsData = await ReportService.getAllReports(page, limit);
        res.json(reportsData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export const updateReportStatusController = async (req, res) => {
    try {
        const { status } = req.body;
        const { reportId } = req.params;

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const updatedReport = await ReportService.updateReportStatus(reportId, status);
        res.json({ message: 'Report status updated successfully', updatedReport });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
