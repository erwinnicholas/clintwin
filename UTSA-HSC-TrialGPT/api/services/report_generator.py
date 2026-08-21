from core.database import get_db_connection

class ReportGenerator:
    @staticmethod
    def generate_html_report(trial_id: str, run_id: str) -> str:
        with get_db_connection() as conn:
            logs = conn.execute(
                "SELECT day, patient_id, arm_id, action, rationale, hard_override FROM simulation_decision_log WHERE run_id = ? ORDER BY day ASC, patient_id ASC",
                (run_id,)
            ).fetchall()
            
            alerts = conn.execute(
                "SELECT day, patient_id, severity, message FROM simulation_alerts WHERE run_id = ? ORDER BY day ASC",
                (run_id,)
            ).fetchall()
            
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>TrialGPT Final Report - {trial_id}</title>
            <style>
                body {{ font-family: 'Inter', sans-serif; color: #333; margin: 40px; line-height: 1.6; }}
                h1, h2, h3 {{ color: #111; }}
                .badge {{ padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; }}
                .badge-CRITICAL {{ background: #ffcccc; color: #cc0000; }}
                .badge-WARNING {{ background: #fff3cd; color: #856404; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
                th {{ background: #f4f4f4; }}
                tr:nth-child(even) {{ background: #fafafa; }}
            </style>
        </head>
        <body>
            <h1>Neuro-Symbolic Clinical Trial Report</h1>
            <h2>Trial ID: {trial_id} | Run ID: {run_id}</h2>
            
            <button onclick="window.print()" style="padding:10px 20px; background:#000; color:#fff; border:none; cursor:pointer; font-size:16px;">Download PDF</button>
            <hr style="margin: 30px 0;">
            
            <h3>1. Adverse Events & Proactive Alerts</h3>
            <table>
                <thead>
                    <tr><th>Day</th><th>Patient ID</th><th>Severity</th><th>Message</th></tr>
                </thead>
                <tbody>
        """
        
        if not alerts:
            html += "<tr><td colspan='4'>No adverse events logged.</td></tr>"
        else:
            for a in alerts:
                html += f"<tr><td>Day {a['day']}</td><td>{a['patient_id']}</td><td><span class='badge badge-{a['severity']}'>{a['severity']}</span></td><td>{a['message']}</td></tr>"
                
        html += """
                </tbody>
            </table>
            
            <h3 style="margin-top:40px;">2. Complete Decision Log (POMDP Agent)</h3>
            <table>
                <thead>
                    <tr><th>Day</th><th>Patient ID</th><th>Arm</th><th>Action</th><th>Rationale</th></tr>
                </thead>
                <tbody>
        """
        
        for l in logs:
            action_col = f"<strong style='color:red'>{l['action']}</strong>" if l['action'] != "CONTINUE" else l['action']
            html += f"<tr><td>Day {l['day']}</td><td>{l['patient_id']}</td><td>{l['arm_id'].replace('ARM_','')}</td><td>{action_col}</td><td>{l['rationale']}</td></tr>"
            
        html += """
                </tbody>
            </table>
        </body>
        </html>
        """
        return html
