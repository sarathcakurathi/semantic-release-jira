import { makeClient } from './functions/jira.js';
const SemanticReleaseError = require('@semantic-release/error');
const validStatuses = ['Resolved']

export function getTickets(config, context) {
    let patterns = [];
  
    if (config.ticketRegex !== undefined) {
      patterns = [new RegExp(config.ticketRegex, 'giu')];
    }
  
    const tickets = new Set();
    for (const commit of context.commits) {
      for (const pattern of patterns) {
        const matches = commit.message.match(pattern);
        if (matches) {
          matches.forEach(match => {
            tickets.add(match);
            context.logger.info(`Found ticket ${matches} in commit: ${commit.commit.short}`);
          });
        }
      }
    }
  
    return [...tickets];
  }


async function validateIssue(config, context, jira, issueId) {
    try {
      context.logger.info(`Finding issue ${issueId}`);
      if (!config.dryRun) {
        let response = await jira.issue.getIssue({
          issueKey: issueId
        });

        if (response.status == 200) {
            let json = await response.json(); 
            if ('status' in json) {
                status = json.status.name
                if (!validStatuses.indexOf(status) >= 0) {
                    context.logger.error(`Issue: ${issueId} is not in a valid state`)
                    return false
                }
                else {
                    return true
                }
            }
            else if ('errorMessages' in json) {
                context.logger.error(`Issue doesnot exist: ${json.errorMessages}`);
                return false
            }
        }
      }
    } catch (err) {
      const allowedStatusCodes = [400, 404];
      let { statusCode } = err;
      if (typeof err === 'string') {
        try {
          err = JSON.parse(err);
          statusCode = statusCode || err.statusCode;
        } catch (err) {
            throw new SemanticReleaseError(`Error: ${err}`)
        }
      }
      if (allowedStatusCodes.indexOf(statusCode) === -1) {
        context.logger.error(`Unable to get issue ${issueKey} statusCode: ${statusCode}`);
        throw new SemanticReleaseError(`Status error: ${err}`);
      }
    }
  }

/**
 * verifyConditions plugin method which checks passed in arguments
 *
 * @param {object} pluginConfig config passed in by semantic-release
 * @param {object} context plugin context passed in by semantic-release
 * @async
 * @throws error messages for invalid or missing arguments
 */
async function verifyConditions(pluginConfig, context) {
  const { env, logger } = context;
  const { auth } = pluginConfig; 

  const tickets = getTickets(pluginConfig, context)
  const jira = makeClient(pluginConfig, context)

  let validations = []
  for (ticket in tickets) {
    validations.push(validateIssue(pluginConfig, context, jira, ticket))
  }

  context.logger.info(validations)
  let result = validations.every(v => v)
  context.logger(result)

  if (!result) {
    throw new SemanticReleaseError(`JIRA keys: ${tickets} not in any of the valid statuses ${validStatuses}`)
  }

  return result;
}

module.exports = verifyConditions;