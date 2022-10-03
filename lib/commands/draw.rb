# frozen_string_literal: true

module Rebbot
  module Commands
    class Draw < Rebbot::Commands::Base
      on :draw, description: 'txt2img with stable diffusion'

      METHODS = ['Euler a', 'Euler', 'LMS', 'Heun', 'DPM2', 'DPM2 a', 'DDIM', 'PLMS'].freeze

      def with_options(cmd)
        cmd.string('prompt', 'what to draw', required: true)
        cmd.string('negative', 'what to not to draw')
        cmd.number('cfg_scale', 'CFG scale (1-30, default: 7)', min_value: 1, max_value: 30)
        cmd.number('sampling_steps', 'sampling steps (1-150, default: 20)', min_value: 1, max_value: 150)
        cmd.string('sampling_method', 'sampling method (default: \'Euler a\')', choices: METHODS.map { |m| [m, m] })
        cmd.number('batch_size', 'batch size (1-8, default: 1)', min_value: 1, max_value: 8)
      end

      def on_event(event)
        return event.respond(content: "😔 Server is offline, help! <@#{Rebbot::ROB_ID}>") if offline?

        send_initial_message(event)

        request_body = build_request(**event.options.transform_keys(&:to_sym))

        response = draw_api.post('/api/predict/') do |req|
          req.body = request_body.to_json
        end

        json = JSON.parse(response.body)
        event.edit_response(content: '❌ An error occurred 🤷‍♂️') if json.keys.include? 'error'

        json['data'].first.each do |img|
          create_and_send_file(event, img)
        end
      end

      private

      def offline?
        response = draw_api.get do |req|
          req.url '/'
          req.options[:timeout] = 2
        end
        response.status != 200
      rescue Faraday::Error, Faraday::Timeout
        true
      end

      def draw_api
        Faraday.new(
          url: 'http://m1.lab.reb.gg:7860', # TODO: env var?
          headers: { 'Content-Type' => 'application/json' }
        )
      end

      def send_initial_message(event)
        message = "🎨 Drawing '#{event.options['prompt']}'"
        extra_args = event.options.except('prompt')
        message += " with #{extra_args.entries.map { |a, b| "`#{a}='#{b}'`" }.join(', ')}" unless extra_args.empty?

        event.respond(content: message)
      end

      def create_and_send_file(event, img)
        tmpfile = Tempfile.new(['drawing', '.png'])
        tmpfile.write(Base64.decode64(img.split('base64,').last))
        tmpfile.rewind

        event.send_message do |builder|
          builder.file = tmpfile
        end
      ensure
        tmpfile.close
        tmpfile.unlink
      end

      # there isn't an API yet: https://github.com/AUTOMATIC1111/stable-diffusion-webui/pull/765
      # hacking on the webui's /predict endpoint for now
      def build_request(
        prompt: '',
        negative: '',
        cfg_scale: 7,
        sampling_steps: 20,
        sampling_method: 'Euler a',
        batch_size: 1
      )
        {
          fn_index: 11,
          data: [
            prompt,
            negative,
            'None',
            'None',
            sampling_steps.to_i,
            sampling_method,
            false,
            false,
            1,
            batch_size.to_i,
            cfg_scale.to_i,
            -1,
            -1,
            0,
            0,
            0,
            false,
            512, # width
            512, # height
            false,
            false,
            0.7,
            'None',
            false,
            nil,
            '',
            false,
            'Seed',
            '',
            'Steps',
            '',
            true,
            false,
            nil,
            '',
            ''
          ]
        }
      end
    end
  end
end
